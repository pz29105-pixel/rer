import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootParams } from '../navigation'

export type Props<K extends keyof RootParams> = NativeStackScreenProps<RootParams, K>
