import { Buffer } from 'buffer';
import Long from 'long';

export class ByteBuffer {
  public static alloc(capacity: number): ByteBuffer {
    const buf = new Uint8Array(capacity);
    return new ByteBuffer(buf, new DataView(buf.buffer));
  }

  public static from(buffer: Buffer | Uint8Array): ByteBuffer {
    if (Buffer.isBuffer(buffer)) {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.length);
      return new ByteBuffer(buffer, view);
    } else {
      const view = new DataView(buffer.buffer);
      return new ByteBuffer(buffer, view);
    }
  }

  private buffer: Uint8Array;
  private view: DataView;
  private _offset = 0;

  public get capacity(): number {
    return this.buffer.byteLength;
  }

  public get offset(): number {
    return this._offset;
  }

  public set offset(newOffset: number) {
    if (newOffset > this.capacity || newOffset < 0) {
      throw new RangeError('Offset is outside the bounds of this ByteBuffer');
    }
    this._offset = newOffset;
  }

  private constructor(buffer: Uint8Array, view: DataView) {
    this.buffer = buffer;
    this.view = view;
  }

  public sharedView(): Uint8Array {
    return this.buffer.subarray(0, this._offset);
  }

  public resetOffset(): ByteBuffer {
    this._offset = 0;
    return this;
  }

  public resize(newCap: number): ByteBuffer {
    newCap = Math.max(this.capacity * 2, newCap);

    const buf = new Uint8Array(newCap);
    buf.set(this.buffer);

    this.buffer = buf;
    this.view = new DataView(buf.buffer);

    return this;
  }

  public reserveExact(newCap: number): ByteBuffer {
    if (this.capacity < newCap) this.resize(newCap);
    return this;
  }

  public reserve(additional: number): ByteBuffer {
    return this.reserveExact(this._offset + additional);
  }

  public readBytes(len: number): Uint8Array {
    const bytes = this.buffer.slice(this._offset, this._offset + len);
    this._offset += len;
    return bytes;
  }

  public writeBytes(value: Uint8Array): ByteBuffer {
    this.reserve(value.byteLength);
    this.buffer.set(value, this._offset);
    this._offset += value.byteLength;
    return this;
  }

  public readUTF8String(len: number): string {
    // Calculate using the view byteOffset as we need to access a potentially shared array and the view already has the
    // correct offsets needed to properly read the array.
    const buf = Buffer.from(this.buffer.buffer, this.view.byteOffset + this._offset, len);
    this._offset += len;
    return buf.toString('utf8');
  }

  public writeUTF8String(value: string): ByteBuffer {
    const len = Buffer.byteLength(value, 'utf8');
    this.reserve(len);

    const buf = Buffer.from(value, 'utf8');
    this.writeBytes(buf);
    return this;
  }

  public readUint8(): number {
    const num = this.view.getUint8(this._offset);
    this._offset += 1;
    return num;
  }

  public writeUint8(value: number): ByteBuffer {
    this.reserve(1);
    this.view.setUint8(this._offset, value);
    this._offset += 1;
    return this;
  }

  public readUint16(): number {
    const num = this.view.getUint16(this._offset, false);
    this._offset += 2;
    return num;
  }

  public writeUint16(value: number): ByteBuffer {
    this.reserve(2);
    this.view.setUint16(this._offset, value, false);
    this._offset += 2;
    return this;
  }

  public readUint32(): number {
    const num = this.view.getUint32(this._offset, false);
    this._offset += 4;
    return num;
  }

  public writeUint32(value: number): ByteBuffer {
    this.reserve(4);
    this.view.setUint32(this._offset, value, false);
    this._offset += 4;
    return this;
  }

  public readUint64(): Long {
    const bytes = this.buffer.subarray(this._offset, this._offset + 8);
    this._offset += 8;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Long.fromBytesBE(bytes as any, true);
  }

  public writeUint64(value: number | Long): ByteBuffer {
    if (typeof value === 'number') {
      value = Long.fromNumber(value, true);
    }

    this.reserve(8);
    this.buffer.set(value.toBytesBE(), this._offset);
    this._offset += 8;

    return this;
  }

  public readVarI64ZigZag(): Long {
    let shift = 0;
    let result = Long.UZERO;

    while (true) {
      if (shift > 63) {
        throw new Error('overflow reading varint');
      }

      const byte = this.readUint8();
      result = result.or(Long.fromNumber(byte & 0x7f, true).shiftLeft(shift));
      if ((byte & 0x80) === 0) {
        break;
      }

      shift += 7;
    }

    return zigzagDecode(result);
  }

  public writeVarI64ZigZag(value: number | Long): ByteBuffer {
    if (typeof value === 'number') {
      value = Long.fromNumber(value, false);
    }

    value = zigzagEncode(value);
    let more = true;
    while (more) {
      let byte = value.and(0x7f);
      value = value.shiftRightUnsigned(7);

      if (value.eq(0)) {
        more = false;
      } else {
        byte = byte.or(0x80);
      }

      this.writeUint8(byte.toNumber());
    }

    return this;
  }
}

export function zigzagEncode(from: Long): Long {
  return from.shiftLeft(1).xor(from.shiftRight(63)).toUnsigned();
}

export function zigzagDecode(from: Long): Long {
  return from.shiftRightUnsigned(1).xor(from.and(1).toSigned().negate()).toSigned();
}
