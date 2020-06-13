import { storiesOf } from '@storybook/react';
import { Comps } from '@eric4hy/common-comps';
import {
  Badge,
  Card,
  Container,
  Row,
  Button,
  Col,
  InputGroup,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import moment from 'moment-timezone';
import DatePicker from 'react-datepicker';
import ReactJson from 'react-json-view';
import React, { useState, useEffect } from 'react';
import {
  ViewConfig,
  FgpGraph,
  Formatters,
  GraphExports,
  FilterType,
} from '@eric4hy/graphs';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-datepicker/dist/react-datepicker.css';
import { library } from '@fortawesome/fontawesome-svg-core';

import { fab } from '@fortawesome/free-brands-svg-icons';

import { fas } from '@fortawesome/free-solid-svg-icons';
import DataService from './service/DataService';

library.add(fab, fas);

const stories = storiesOf('Graphs', module);
// create story here
stories.add('default', () => {
  const [startDate, setStartDate] = useState(
    moment().subtract(7, 'days').startOf('day').toDate(),
  );
  const [endDate, setEndDate] = useState(
    moment().add(1, 'days').startOf('day').toDate(),
  );
  const [graphDiv, setGraphDiv] = useState<HTMLDivElement>(null);
  const [mainGraph, setMainGraph] = useState<FgpGraph>(null);
  const [highlightTimer, setHighlightTimer] = useState(-1);
  const [mainViewConfigs, setMainViewConfigs] = useState<Array<ViewConfig>>();
  const [childViewConfigs, setChildViewConfigs] = useState<Array<ViewConfig>>();
  const [formatters, setformatters] = useState(() => {
    const formatters = new Formatters('Australia/Melbourne');
    formatters.setFormat('DD MMM YYYY h:mm a Z');
    return formatters;
  });
  const [dataService, setdataService] = useState(() => {
    //
    return new DataService();
  });
  const [syncDateWindow, setsyncDateWindow] = useState([
    moment().subtract(7, 'days').valueOf(),
    moment().valueOf(),
  ]);
  const [childrenGraph, setchildrenGraph] = useState<
    Array<{
      id: string;
      viewConfigs: Array<ViewConfig>;
      onReady(div: HTMLDivElement, g: FgpGraph): void;
    }>
  >([]);

  const changeGraphSize = (graphDiv: HTMLElement, size: number): void => {
    graphDiv.style.height = size + 'px';
  };

  const onViewChange = (g: FgpGraph, view: ViewConfig): void => {
    console.log(`view changed to [${view.name}]`);
    const mainGraph = g;
    const dateWindow = mainGraph.currentDateWindow;
    if ('device view' === view.name) {
      // add new child graph
      setchildrenGraph([]);
    } else {
      // setTimeout(() => {
      //     mainGraph.updateDatewinow([dateWindow[0], dateWindow[1]]);
      // }, 200);

      // update initRange for children graphs
      childViewConfigs.forEach((view) => {
        view.initRange = { start: dateWindow[0], end: dateWindow[1] };
      });

      // add new child graph
      setchildrenGraph(() => {
        return [
          {
            id: '' + Math.random() * 1000,
            viewConfigs: childViewConfigs,
            onReady: (div: HTMLDivElement, childGraph: FgpGraph): void => {
              mainGraph.setChildren([childGraph]);
            },
          },
        ];
      });
    }

    // setTimeout(() => {
    //
    //     g.updateDatewinow([moment("2019-11-20").valueOf(), moment("2019-12-30").valueOf()])
    //
    //
    //     setTimeout(() => {
    //
    //         g.updateDatewinow([moment("2019-11-20").valueOf(), moment("2019-11-24").valueOf()])
    //
    //     }, 5000);
    //
    // }, 5000);

    // setTimeout(() => {
    //     g.highlightSeries(["meter3"], 0);
    // }, 5000);
  };

  const onIntervalChange = (
    g: FgpGraph,
    interval: { name: string; value: number; show?: boolean },
  ): void => {
    console.log(`interval changed to [${interval}]`);
  };

  const onHighlightBtnClick = (): void => {
    if (highlightTimer) {
      clearInterval(highlightTimer);
      setHighlightTimer(undefined);
    } else {
      // get graph date window
      const dateWindow = syncDateWindow;
      console.log(`${dateWindow}`);
      if (dateWindow) {
        let tempInterval = moment(dateWindow[0]).startOf('hour').valueOf();
        setHighlightTimer(
          window.setInterval(() => {
            if (tempInterval < dateWindow[1]) {
              mainGraph?.highlightOnTimestamp(tempInterval);
              tempInterval += 60 * 60 * 1000;
            } else {
              tempInterval = dateWindow[0];
            }
          }, 500),
        );
      }
    }
  };

  const updateDateWindow = (): void => {
    // set graph dateWindow
    if (mainGraph) {
      mainGraph.updateDatewinow([startDate.valueOf(), endDate.valueOf()]);
    }
  };

  const readyCallback = (div: HTMLDivElement, g: FgpGraph): void => {
    setGraphDiv(div);
    setMainGraph(g);
  };

  const prepareViewConfigs = (): void => {
    const vdConfig: ViewConfig = {
      name: 'device view',
      connectSeparatedPoints: false,
      graphConfig: {
        hideHeader: {
          views: false,
          intervals: false,
          toolbar: false,
          series: false,
        },
        // hideHeader: true,
        features: {
          zoom: true,
          scroll: true,
          // rangeBar: {show: true, format: 'DD MMM YYYY h:mm a'},
          rangeBar: true,
          legend: formatters.legendForAllSeries,
          exports: [GraphExports.Data, GraphExports.Image, GraphExports.Draw],
          rangeLocked: false, // lock or unlock range bar
        },
        entities: [
          {
            id: 'substation1',
            type: 'substation',
            name: 'substation1',
          },
        ],
        rangeEntity: {
          id: 'substation1',
          type: 'substation',
          name: 'substation1',
        },
        rangeCollection: {
          label: 'substation_day',
          name: 'substation_interval_day',
          interval: 86400000,
          series: [
            {
              label: 'Avg',
              type: 'line',
              exp: 'data.avgConsumptionVah',
            },
          ],
        },
        collections: [
          {
            label: 'substation_day',
            name: 'substation_interval_day',
            interval: 86400000,
            // markLines: [{value: 255, label: '255', color: '#FF0000'}, {value: 235, label: '235', color: '#FF0000'}],
            series: [
              {
                label: 'Avg',
                type: 'line',
                exp: 'data.avgConsumptionVah',
                yIndex: 'left',
              },
              {
                label: 'Max',
                type: 'line',
                exp: 'data.maxConsumptionVah',
                yIndex: 'left',
                color: '#ff0000',
              },
              // {
              //     label: "Min",
              //     type: 'dots',
              //     exp: "data.minConsumptionVah",
              //     yIndex: 'left',
              //     extraConfig: {any: "anything"}
              // }
            ],
            threshold: {
              min: 1000 * 60 * 60 * 24 * 10,
              max: 1000 * 60 * 60 * 24 * 7 * 52 * 10,
            }, // 7 days ~ 3 weeks
            yLabel: 'voltage',
            y2Label: 'voltage',
            // initScales: {left: {min: 230, max: 260}},
            fill: false,
          },
          {
            label: 'substation_raw',
            name: 'substation_interval',
            interval: 3600000,
            markLines: [
              {
                value: 256,
                label: '256',
                color: '#FF0000',
                y: 'left',
              },
              {
                value: 248,
                label: '248',
                color: '#FF0000',
                y: 'left',
              },
            ],
            // initScales: {left: {min: 245, max: 260}, right: undefined},
            series: [
              {
                label: 'Avg',
                type: 'line',
                exp: 'data.avgConsumptionVah',
                yIndex: 'left',
                color: '#058902',
                visibility: false,
              },
              {
                label: 'Max',
                type: 'line',
                exp: 'data.maxConsumptionVah',
                yIndex: 'left',
                color: '#d80808',
              },
              {
                label: 'Min',
                type: 'line',
                exp: 'data.minConsumptionVah',
                yIndex: 'left',
                color: '#210aa8',
                extraConfig: { name: 'helloword' },
              },
            ],
            threshold: { min: 0, max: 1000 * 60 * 60 * 24 * 10 }, //  0 ~ 10 days
            yLabel: 'voltage',
            y2Label: 'voltage',
            // initScales: {left: {min: 245, max: 260}},
            fill: false,
          },
        ],
        filters: {
          buttons: [
            {
              label: 'All',
              func: (): Array<string> => {
                return ['Min', 'Max', 'Avg'];
              },
            },
            {
              label: 'Min',
              func: (): Array<string> => {
                return ['Min'];
              },
            },
            {
              label: 'Max',
              func: (): Array<string> => {
                return ['Max'];
              },
            },
            {
              label: 'Avg',
              func: (): Array<string> => {
                return ['Avg'];
              },
            },
            {
              label: 'Colors',
              type: FilterType.COLORS,
              func: (labels?: Array<string>): Array<string> => {
                const colors: Array<string> = [];
                // generate colors
                if (labels) {
                  labels.forEach(() => {
                    colors.push('#FF0000');
                  });
                }
                return colors;
              },
            },
            {
              label: 'reset Colors',
              type: FilterType.COLORS,
              func: (): Array<string> => {
                return [];
              },
            },
          ],
        },
      },
      dataService: dataService,
      show: true,
      ranges: [
        { name: '1 month', value: 2592000000 },
        { name: '7 days', value: 604800000, show: true },
        { name: '1 day', value: 1000 * 60 * 60 * 24 },
        { name: '2 hours', value: 1000 * 60 * 60 * 2 },
        { name: '1 hours', value: 1000 * 60 * 60 },
        { name: 'half an hour', value: 1000 * 60 * 30 },
        { name: '10 mins', value: 1000 * 60 * 10 },
      ],
      // initRange: {
      //     start: moment("2019-11-01").add(0, 'days').startOf('day').valueOf(),
      //     end: moment("2019-12-01").subtract(0, 'days').endOf('day').valueOf()
      // },
      interaction: {
        callback: {
          highlightCallback: (): void => {
            // console.debug("selected series: ", series);
          },
          syncDateWindow: (dateWindow): void => {
            // console.debug("eric", moment(dateWindow[0]), moment(dateWindow[1]));

            setsyncDateWindow([dateWindow[0], dateWindow[1]]);
            //
            // vsConfig.initRange = {start: dateWindow[0], end: dateWindow[1]};
          },
          dbClickCallback: (): void => {
            // console.debug("dbl callback, ", series);
          },
          clickCallback: (series): void => {
            console.debug('click callback, ', series);
          },
          multiSelectionCallback: (series: Array<string>): void => {
            console.log(`${series}`);
          },
        },
      },
      timezone: 'Australia/Melbourne',
      highlightSeriesBackgroundAlpha: 1,
      // timezone: 'Pacific/Auckland'
    };

    const vsConfig: ViewConfig = {
      name: 'scatter view',
      graphConfig: {
        features: {
          zoom: true,
          scroll: true,
          rangeBar: true,
          legend: formatters.legendForSingleSeries,
          exports: [GraphExports.Data, GraphExports.Image, GraphExports.Draw],
          toolbar: {
            buttons: [
              {
                label: 'height: 300px',
                prop: {},
                func: (): void => {
                  // do nothing, just show it in dropdown
                  if (graphDiv) {
                    changeGraphSize(graphDiv, 300);
                  }
                },
              },
            ],
            dropdown: [
              [
                {
                  label: 'height',
                  prop: {},
                  func: (): void => {
                    // do nothing, just show it in dropdown
                    if (graphDiv) {
                      changeGraphSize(graphDiv, 300);
                    }
                  },
                },
                {
                  label: '500px',
                  prop: {},
                  func: (): void => {
                    // do what you need to do here. such as change height
                    if (graphDiv) {
                      changeGraphSize(graphDiv, 500);
                    }
                  },
                },
                {
                  label: '800px',
                  prop: {},
                  func: (): void => {
                    // do what you need to do here. such as change height
                    if (graphDiv) {
                      changeGraphSize(graphDiv, 800);
                    }
                  },
                },
              ],
            ],
          },
        },
        entities: [
          { id: 'meter1', type: 'meter', name: 'meter1-1' },
          { id: 'meter3', type: 'meter', name: 'meter3-3' },
          // {id: "meter2", type: "meter", name: "meter2"},
          { id: '?', type: 'meter', name: '?', fragment: true },
        ],
        rangeEntity: {
          id: 'substation1',
          type: 'substation',
          name: 'substation1',
        },
        rangeCollection: {
          label: 'substation_day',
          name: 'substation_interval_day',
          interval: 86400000,
          series: [
            {
              label: 'Avg',
              type: 'line',
              exp: 'data.avgConsumptionVah',
            },
          ],
        },
        collections: [
          {
            label: 'meter_raw',
            name: 'meter_read',
            interval: 3600000,
            series: [
              {
                label: 'Voltage',
                type: 'line',
                exp: 'data.voltage',
                yIndex: 'left',
              },
            ],
            threshold: { min: 0, max: 1000 * 60 * 60 * 24 * 10 }, //  0 ~ 10 days
            initScales: { left: { min: 245, max: 260 } },
            yLabel: 'voltage',
            syncParentSelection: false,
          },
          {
            label: 'meter_day',
            name: 'meter_read_day',
            interval: 86400000,
            series: [
              {
                label: 'Avg Voltage',
                type: 'line',
                exp: 'data.avgVoltage',
                yIndex: 'left',
              },
            ],
            threshold: {
              min: 1000 * 60 * 60 * 24 * 10,
              max: 1000 * 60 * 60 * 24 * 7 * 52 * 10,
            }, // 7 days ~ 3 weeks
            initScales: { left: { min: 245, max: 260 } },
            yLabel: 'voltage',
            syncParentSelection: false,
          },
        ],
        filters: {
          dropdown: [
            {
              label: 'All',
              func: (): Array<string> => {
                return ['meter1', 'meter2', 'meter3'];
              },
            },
            {
              label: 'Meter1',
              func: (): Array<string> => {
                return ['meter1'];
              },
            },
            {
              label: 'Meter2',
              func: (): Array<string> => {
                return ['meter2'];
              },
            },
          ],
        },
      },
      dataService: dataService,
      show: false,
      ranges: [
        { name: '1 month', value: 2592000000 },
        { name: '7 days', value: 604800000, show: true },
      ],
      initRange: {
        start: moment().subtract(5, 'days').startOf('day').valueOf(),
        end: moment().add(1, 'days').valueOf(),
      },
      interaction: {
        callback: {
          highlightCallback: (datetime, series): void => {
            console.debug('selected series: ', series); // too many messages in console
            // childGraph.highlightSeries([series], 0);
          },
          dbClickCallback: (): void => {
            // console.debug("dbl callback, ", series);
          },
          clickCallback: (series): void => {
            console.debug('click callback, ', series);
          },
          multiSelectionCallback: (series: Array<string>): void => {
            console.log(`${series}`);
          },
          syncDateWindow: (dateWindow: number[]): void => {
            setsyncDateWindow([dateWindow[0], dateWindow[1]]);
            console.log(`WTF2: ${dateWindow}`);
          },
        },
      },
      timezone: 'Australia/Melbourne',
      // timezone: 'Pacific/Auckland'
    };

    const vsConfig2: ViewConfig = {
      name: 'scatter view',
      graphConfig: {
        features: {
          zoom: true,
          scroll: false,
          rangeBar: false,
          legend: formatters.legendForSingleSeries,
        },
        entities: [
          { id: 'meter1', type: 'meter', name: 'meter1-1' },
          { id: 'meter2', type: 'meter', name: 'meter2-2' },
        ],
        rangeEntity: {
          id: 'substation1',
          type: 'substation',
          name: '**F**substation',
        },
        rangeCollection: {
          label: 'substation_day',
          name: 'substation_interval_day',
          interval: 86400000,
          series: [
            {
              label: 'Avg',
              type: 'line',
              exp: 'data.avgConsumptionVah',
            },
          ],
        },
        collections: [
          {
            label: 'meter_raw',
            name: 'meter_read',
            interval: 3600000,
            series: [
              {
                label: 'Voltage',
                type: 'line',
                exp: 'data.voltage',
                yIndex: 'left',
              },
            ],
            threshold: { min: 0, max: 1000 * 60 * 60 * 24 * 10 }, //  0 ~ 10 days
            initScales: { left: { min: 245, max: 260 } },
            yLabel: 'voltage',
            syncParentSelection: true,
          },
          {
            label: 'meter_day',
            name: 'meter_read_day',
            interval: 86400000,
            series: [
              {
                label: 'Avg Voltage',
                type: 'line',
                exp: 'data.avgVoltage',
                yIndex: 'left',
              },
            ],
            threshold: {
              min: 1000 * 60 * 60 * 24 * 10,
              max: 1000 * 60 * 60 * 24 * 7 * 52 * 10,
            }, // 7 days ~ 3 weeks
            initScales: { left: { min: 245, max: 260 } },
            yLabel: 'voltage',
            syncParentSelection: false,
          },
        ],
      },
      dataService: dataService,
      show: true,
      ranges: [
        { name: '7 days', value: 604800000, show: true },
        { name: '1 month', value: 2592000000 },
      ],
      initRange: {
        start: moment().subtract(10, 'days').startOf('day').valueOf(),
        end: moment().add(1, 'days').valueOf(),
      },
      interaction: {
        callback: {
          highlightCallback: (): void => {
            // console.debug("selected series: ", series);
          },
          clickCallback: (): void => {
            // console.debug("choosed series: ", series);
          },
        },
      },
      timezone: 'Australia/Melbourne',
      // timezone: 'Pacific/Auckland'
    };
    setMainViewConfigs([...[vdConfig, vsConfig]]);
    setChildViewConfigs([...[vsConfig2]]);
  };

  useEffect(() => {
    //
    prepareViewConfigs();
  }, []);

  return (
    <Container fluid={true} className="graph">
      {/*other widgets*/}
      <Row
        style={{
          paddingLeft: '15px',
          paddingRight: '15px',
          paddingTop: '15px',
        }}
      >
        <Card style={{ width: '100%' }}>
          {/* <Card.Header></Card.Header> */}
          <Card.Body style={{ padding: 5 }}>
            <Row>
              <Col xs lg="5">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={onHighlightBtnClick}
                >
                  Highlight
                </Button>
              </Col>
              <Col md="7" style={{ paddingRight: '32px' }}>
                <Row className="justify-content-end">
                  <InputGroup size="sm" style={{ width: '220px' }}>
                    <InputGroup.Prepend>
                      <InputGroup.Text id="basic-addon3">Start</InputGroup.Text>
                    </InputGroup.Prepend>
                    <DatePicker
                      style={{ width: '100%' }}
                      className="form-control form-control-sm"
                      selected={startDate}
                      onChange={(date: Date): void => {
                        setStartDate(date);
                      }}
                      dateFormat="dd/MM/yyyy"
                    />
                  </InputGroup>
                  <InputGroup size="sm" style={{ width: '220px' }}>
                    <InputGroup.Prepend>
                      <InputGroup.Text id="basic-addon3">End</InputGroup.Text>
                    </InputGroup.Prepend>
                    <DatePicker
                      style={{ width: '100%' }}
                      className="form-control form-control-sm"
                      selected={endDate}
                      onChange={(date: Date): void => {
                        setEndDate(date);
                      }}
                      dateFormat="dd/MM/yyyy"
                    />
                  </InputGroup>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={updateDateWindow}
                  >
                    Update
                  </Button>
                </Row>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Row>
      {/*main graph*/}
      <Row
        style={{
          paddingLeft: '15px',
          paddingRight: '15px',
          paddingTop: '15px',
        }}
      >
        <Card style={{ width: '100%' }}>
          <Card.Header>
            <Badge variant="info">
              <FontAwesomeIcon icon={['fas', 'chart-area'] as IconProp} />{' '}
              @future-grid/fgp-graph / Main Graph
            </Badge>
          </Card.Header>
          <Card.Body>
            <Comps.Graphs
              viewConfigs={mainViewConfigs}
              onReady={readyCallback}
              viewChangeListener={onViewChange}
              intervalChangeListener={onIntervalChange}
            />
            <ReactJson
              src={mainViewConfigs}
              name={'viewConfigs'}
              collapsed={true}
              iconStyle={'circle'}
            />
          </Card.Body>
        </Card>
      </Row>

      {/*children graphs*/}

      {childrenGraph.length > 0 ? (
        <Row
          style={{
            paddingLeft: '15px',
            paddingRight: '15px',
            paddingTop: '15px',
          }}
        >
          <Card style={{ width: '100%' }}>
            <Card.Header>
              <Badge variant="warning">
                @future-grid/fgp-graph / Children Graphs
              </Badge>
            </Card.Header>
            <Card.Body>
              {childrenGraph.map(
                (_config: {
                  id: string;
                  viewConfigs: Array<ViewConfig>;
                  onReady(div: HTMLDivElement, g: FgpGraph): void;
                }) => {
                  return (
                    <div key={_config.id}>
                      <Comps.Graphs
                        viewConfigs={_config.viewConfigs}
                        onReady={_config.onReady}
                      />
                      <ReactJson
                        src={_config.viewConfigs}
                        name={'viewConfigs'}
                        collapsed={true}
                        iconStyle={'circle'}
                      />
                    </div>
                  );
                },
              )}
            </Card.Body>
          </Card>
        </Row>
      ) : null}
    </Container>
  );
});
