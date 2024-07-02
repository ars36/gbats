import { Canvas, createCanvas } from "@napi-rs/canvas";
import { GameBoyAdvance } from "./gba";
import { Pointer, Serializer, dataURItoBlob, encode } from "./util";
import * as fs from 'fs'

export default class Wrapper {
  emulator: GameBoyAdvance
  bios: Buffer
  canvas: Canvas
  rom: Buffer
  constructor(
    {bios, canvas = createCanvas(240, 160), rom}: {
      bios?: Buffer,
      canvas?: Canvas
      rom: Buffer
    }
  ) {
    this.bios = bios
    this.canvas = canvas
    this.rom = rom
    this.resetEmulator()
  }

  resetEmulator() {
    if(this.emulator) this.emulator.pause()
    this.emulator = new GameBoyAdvance(this.bios)
    this.emulator.setCanvas(this.canvas)
    this.emulator.loadRom(this.rom)
    this.emulator.runStable()
  }

  async createSaveState(file_path?: string) {
    this.emulator.pause()
    const freeze = this.emulator.freeze() as any

    const ser = Serializer.serialize(freeze)
    const data = 'data:application/octet-stream;base64,' + encode(new Uint8Array(await ser.arrayBuffer()))

    this.emulator.runStable()

    if(file_path) await fs.promises.writeFile(file_path, data)

    return data
  }

  async loadSaveState(backupOrFilePath: Buffer | string) {
    this.resetEmulator()
    

    let state: ArrayBuffer
    if(typeof backupOrFilePath === "string") {
      const buffer = await fs.promises.readFile(backupOrFilePath)
      state = await dataURItoBlob(buffer.toString()).arrayBuffer()
    } else state = await dataURItoBlob(backupOrFilePath.toString()).arrayBuffer()

    const out = Serializer.deserealizeStream(new DataView(state), new Pointer())
    this.emulator.pause()
    this.emulator.defrost(out)
    this.emulator.runStable()

    return this
  }

  press(input: "A" | "B" | "SELECT" | "START" | "RIGHT" | "LEFT" | "UP" | "DOWN" | "L" | "R") {
    this.emulator.keypad.press(input)
  }

  screen() {
    return this.canvas.encode('webp')
  }
}