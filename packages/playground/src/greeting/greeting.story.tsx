import { storiesOf } from '@storybook/react';
import { Graphs } from '@eric4hy/graphs';
import React from 'react';

storiesOf('Greeting', module).add('with title', () => {
  return <Graphs.Greeting title='Eric'></Graphs.Greeting>;
});
