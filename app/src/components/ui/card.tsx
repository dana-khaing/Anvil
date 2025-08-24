import { type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

export type CardProps = ViewProps & {
  children: ReactNode;
};

export function Card({ children, className, ...rest }: CardProps) {
  return (
    <View
      className={`rounded-2xl border border-border bg-surface-raised p-4 ${className ?? ''}`}
      {...rest}>
      {children}
    </View>
  );
}
