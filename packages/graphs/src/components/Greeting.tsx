import React, { FC } from 'react';

type CardProps = {
  title: string;
};
export const Greeting: FC<CardProps> = ({ title }) => {
  return <div>Hello {title}</div>;
};
