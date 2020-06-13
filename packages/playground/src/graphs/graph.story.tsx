import { storiesOf } from '@storybook/react';
import { Comps } from '@eric4hy/common-comps';
import { Badge, Card, Container, Row, Button, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import moment from 'moment-timezone';
import DatePicker from 'react-datepicker';
import ReactJson from 'react-json-view';
import React, { useState } from 'react';
import { ViewConfig, FgpGraph } from '@eric4hy/graphs';

const stories = storiesOf('Graphs', module);
// create story here
stories.add('default', () => {
  const [startDate, setStartDate] = useState(moment().toDate());
  const [endDate, setEndDate] = useState(moment().toDate());

  return (
    <Container fluid={true} className="graph">
      {/*other widgets*/}
      <Row style={{ paddingLeft: '15px', paddingRight: '15px' }}>
        <Card style={{ width: '100%' }}>
          {/* <Card.Header></Card.Header> */}
          <Card.Body>
            <Row>
              <Col>
                <Button variant="outline-primary" size="sm" onClick={this.onHighlightBtnClick}>
                  Highlight Dots on graphs
                </Button>
              </Col>
              <Col>
                <Row style={{ float: 'right', paddingRight: '20px' }}>
                  <div className={'d-flex align-items-center m-left-10px m-right-2px'}>Start:</div>
                  <div style={{ width: '180px' }}>
                    <DatePicker
                      selected={startDate}
                      fixedHeight
                      onChange={(date: Date): void => {
                        setStartDate(date);
                      }}
                    />
                  </div>
                  <div className={'d-flex align-items-center m-left-10px m-right-2px'}>End:</div>
                  <div style={{ width: '180px' }}>
                    <DatePicker
                      selected={endDate}
                      fixedHeight
                      onChange={(date: Date): void => {
                        setEndDate(date);
                      }}
                    />
                  </div>
                  <Button variant="outline-primary" size="sm" onClick={this.updateDateWindow}>
                    Confirm
                  </Button>
                </Row>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Row>
      {/*main graph*/}
      {/* <Row style={{ paddingLeft: '15px', paddingRight: '15px', paddingTop: '15px' }}>
        <Card style={{ width: '100%' }}>
          <Card.Header>
            <Badge variant="info">
              <FontAwesomeIcon icon={['fas', 'chart-area'] as IconProp} /> @future-grid/fgp-graph / Main Graph
            </Badge>
          </Card.Header>
          <Card.Body>
            <Comps.Graphs
              viewConfigs={this.mainViewConfigs}
              onReady={this.readyCallback}
              viewChangeListener={this.onViewChange}
              intervalChangeListener={this.onIntervalChange}
            />
            <ReactJson src={this.mainViewConfigs} name={'viewConfigs'} collapsed={true} iconStyle={'circle'} />
          </Card.Body>
        </Card>
      </Row> */}

      {/*children graphs*/}

      {/* {this.state.childrenGraph.length > 0 ? (
        <Row style={{ paddingLeft: '15px', paddingRight: '15px', paddingTop: '15px' }}>
          <Card style={{ width: '100%' }}>
            <Card.Header>
              <Badge variant="warning">@future-grid/fgp-graph / Children Graphs</Badge>
            </Card.Header>
            <Card.Body>
              {this.state.childrenGraph.map(
                (_config: {
                  id: string;
                  viewConfigs: Array<ViewConfig>;
                  onReady(div: HTMLDivElement, g: FgpGraph): void;
                }) => {
                  return (
                    <div key={_config.id}>
                      <Comps.Graphs viewConfigs={_config.viewConfigs} onReady={_config.onReady} />
                      <ReactJson src={_config.viewConfigs} name={'viewConfigs'} collapsed={true} iconStyle={'circle'} />
                    </div>
                  );
                },
              )}
            </Card.Body>
          </Card>
        </Row>
      ) : null} */}
    </Container>
  );
});
