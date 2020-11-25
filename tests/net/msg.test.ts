import { ByteBuffer, Msg, BodyType, NetworkError, NetErrorKind } from '../../src';
import Long from 'long';

test('fail to deserialize invalid response type id', (): void => {
  const buf = ByteBuffer.alloc(128).writeUint32(0).writeUint8(0xff).resetOffset();
  expect((): void => {
    Msg.deserialize(buf);
  }).toThrowError('unknown msg body id: 255');
});

test('serialize error msg', (): void => {
  const msg = new Msg(123, {
    type: BodyType.Error,
    error: new NetworkError(NetErrorKind.Io),
  });
  const buf = ByteBuffer.alloc(4096);
  msg.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(msg);
});

test('serialize ping msg', (): void => {
  const msg = new Msg(123, {
    type: BodyType.Ping,
    nonce: Long.fromNumber(98765, true),
  });
  const buf = ByteBuffer.alloc(4096);
  msg.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(msg);
});

test('serialize pong msg', (): void => {
  const msg = new Msg(123, {
    type: BodyType.Pong,
    nonce: Long.fromNumber(98765, true),
  });
  const buf = ByteBuffer.alloc(4096);
  msg.serialize(buf);
  buf.resetOffset();
  expect(Msg.deserialize(buf)).toStrictEqual(msg);
});
