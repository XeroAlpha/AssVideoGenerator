import { getInputProps as remotionGetInputProps } from 'remotion';
import { ZodType, ZodTypeDef } from 'zod';

export function getInputProps<T>(schema: ZodType<T, ZodTypeDef, T>) {
  const codeInputProps = remotionGetInputProps();
  const envInputProps = process.env.REMOTION_INPUT_PROPS;
  if (envInputProps) {
    return schema.parse(JSON.parse(envInputProps));
  }
  return schema.parse(codeInputProps);
}
