import {
  ByteBuffer,
  NetworkError,
  NetErrorKind,
  TxVerifyError,
  TxVerifyErrorKind,
  ScriptEvalError,
  ScriptEvalErrorKind,
} from '../../src';

test('fail to deserialize invalid type id net error', (): void => {
  const buf = ByteBuffer.alloc(1).writeUint8(0xff).resetOffset();
  expect((): void => {
    NetworkError.deserialize(buf);
  }).toThrowError('unknown error kind: 255');
});

test('tx validation error requires meta', (): void => {
  expect((): void => {
    new NetworkError(NetErrorKind.TxValidation);
  }).toThrowError('invalid error type for TxValidation');
});

test('serialize network error', (): void => {
  const buf = ByteBuffer.alloc(32);
  const cmp = (error: NetworkError): void => {
    buf.resetOffset();
    error.serialize(buf);
    buf.resetOffset();

    const des = NetworkError.deserialize(buf);
    expect(des).toStrictEqual(error);
    expect(des).toBeInstanceOf(NetworkError);
    expect(error).toBeInstanceOf(NetworkError);
  };
  cmp(new NetworkError(NetErrorKind.Io));
  cmp(new NetworkError(NetErrorKind.BytesRemaining));
  cmp(new NetworkError(NetErrorKind.InvalidRequest));
  cmp(new NetworkError(NetErrorKind.InvalidHeight));

  const scriptError = new ScriptEvalError(ScriptEvalErrorKind.InvalidItemOnStack, 32);
  const verifyError = new TxVerifyError(TxVerifyErrorKind.ScriptEval, scriptError);
  cmp(new NetworkError(NetErrorKind.TxValidation, verifyError));
});
