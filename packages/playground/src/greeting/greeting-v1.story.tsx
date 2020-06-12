import { storiesOf } from '@storybook/react';
import { Graphs } from '@eric4hy/graphs';
import React from 'react';

const stories = storiesOf('Greeting', module);
// create story here
stories.add('with title', () => {
  return <Graphs.Greeting title='Eric'></Graphs.Greeting>;
});
