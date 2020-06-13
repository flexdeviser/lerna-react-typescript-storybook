import { storiesOf } from '@storybook/react';
import { Comps } from '@eric4hy/common-comps';
import React from 'react';

const stories = storiesOf('Greeting', module);
// create story here
stories.add('with title', () => {
  return <Comps.Greeting title="Eric"></Comps.Greeting>;
});
