/* eslint-disable @typescript-eslint/no-explicit-any */
import moment from 'moment-timezone';
import { DataHandler, GraphSeries, DataRequestTarget } from '@eric4hy/graphs';

/**
 * Graph data service(demo data)
 */
export default class DataService implements DataHandler {
  randomNumber = (min: number, max: number): number => {
    // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  rangeData: any[] = [];

  private deviceData: any[] = [];

  constructor() {
    this.rangeData = [
      {
        id: 'meter1',
        data: {
          first: { timestamp: new Date('2019/10/01').getTime(), voltage: this.randomNumber(252, 255) },
          last: {
            timestamp: moment().add(1, 'days').startOf('day').valueOf(),
            voltage: this.randomNumber(252, 255),
          },
        },
      },
      {
        id: 'meter2',
        data: {
          first: { timestamp: new Date('2019/10/01').getTime(), voltage: this.randomNumber(252, 255) },
          last: {
            timestamp: moment().add(1, 'days').startOf('day').valueOf(),
            voltage: this.randomNumber(252, 255),
          },
        },
      },
      {
        id: 'meter3',
        data: {
          first: { timestamp: new Date('2019/10/01').getTime(), voltage: this.randomNumber(252, 255) },
          last: {
            timestamp: moment().add(1, 'days').startOf('day').valueOf(),
            voltage: this.randomNumber(252, 255),
          },
        },
      },
      {
        id: 'substation1',
        data: {
          first: { timestamp: new Date('2019/10/01').getTime(), avgConsumptionVah: this.randomNumber(252, 255) },
          last: {
            timestamp: moment().add(1, 'days').startOf('day').valueOf(),
            avgConsumptionVah: this.randomNumber(252, 255),
          },
        },
      },
    ];
  }

  fetchFirstNLast(
    ids: string[],
    type: string,
    interval: string,
    fields?: string[],
  ): Promise<{ id: string; data: { first: any; last: any } }[]> {
    return new Promise((resolve, reject) => {
      // sample data for first and last
      resolve(this.rangeData);
    });
  }

  fetchdata(
    ids: string[],
    type: string,
    interval: string,
    range: { start: number; end: number },
    fields?: string[],
    seriesConfig?: Array<GraphSeries>,
    target?: DataRequestTarget,
  ): Promise<{ id: string; data: any[] }[]> {
    console.debug(`fetching data from server... target: ${target}`);
    // let firstDate = moment(range.start);
    let firstDate = moment('2019/10/01', 'YYYY/MM/DD'); // test
    let tempDate = firstDate.startOf('day').valueOf();
    const existData: any[] = [];
    ids.forEach((id) => {
      let exist = this.deviceData.find((_data) => {
        return _data.id === id && _data.interval === interval;
      });
      if (!exist) {
        exist = { id: id, interval: interval, data: [] };
        this.deviceData.push(exist);
      }
      existData.push(exist);
    });

    while (tempDate <= range.end) {
      const currentDate = tempDate;
      // create data for different devices with correct interval
      existData.forEach((_ed) => {
        if (_ed.id.indexOf('meter') !== -1) {
          // if (_ed.id.indexOf('meter2') === -1) {
          // get existing data
          if (_ed.interval === interval) {
            // find data
            let recordExist = false;
            _ed.data.forEach((_data: any) => {
              if (_data.timestamp === currentDate) {
                // found it
                recordExist = true;
              }
            });
            if (!recordExist) {
              if (_ed.id === 'meter11') {
                // add new one
                _ed.data.push({
                  timestamp: currentDate,
                  voltage: null,
                  amp: null,
                  avgVoltage: null,
                });
              } else {
                // add new one
                _ed.data.push({
                  timestamp: currentDate,
                  voltage: this.randomNumber(252, 255),
                  amp: this.randomNumber(1, 2),
                  avgVoltage: this.randomNumber(250, 255),
                });
              }
            }
            // }
          }
        } else if (_ed.id.indexOf('substation') !== -1) {
          if (_ed.interval === interval) {
            // find data
            let recordExist = false;
            _ed.data.forEach((_data: any) => {
              if (_data.timestamp === currentDate) {
                // found it
                recordExist = true;
              }
            });
            if (!recordExist) {
              const max: number = this.randomNumber(253, 255);
              const min: number = this.randomNumber(250, 252);
              const avg: number = Math.floor((max + min) / 2);

              // if ("substation_interval" === interval) {
              //     max = this.randomNumber(30, 20);
              //     min = this.randomNumber(20, 10);
              //     avg = Math.floor((max + min) / 2);
              // }

              // add new one
              _ed.data.push({
                timestamp: currentDate,
                avgConsumptionVah: avg,
                maxConsumptionVah: max,
                minConsumptionVah: min,
              });
            }
          }
        }
      });

      /**
       * let firstDate = moment(range.start);
       * let tempDate = firstDate.startOf('day').valueOf();
       */

      if ('substation_interval_day' === interval) {
        firstDate = firstDate.add(1, 'days');
      } else if ('substation_interval' === interval) {
        firstDate = firstDate.add(1, 'hours');
      } else if ('meter_read_day' === interval) {
        firstDate = firstDate.add(1, 'days');
      } else if ('meter_read' === interval) {
        firstDate = firstDate.add(1, 'hours');
      }
      tempDate = firstDate.valueOf();
    }

    return new Promise((resolve, reject) => {
      const sampleData: Array<{ id: string; data: Array<any> }> = [];
      // find data for current device and interval
      this.deviceData.forEach((_data) => {
        ids.forEach((_id) => {
          if (_id === _data.id && _data.interval === interval) {
            // found data
            const _records: any[] = [];
            _data.data.forEach((_d: any) => {
              if (_d.timestamp >= range.start && _d.timestamp <= range.end) {
                _records.push(_d);
              }
            });
            // //
            // const startInRequest = moment(range.start).valueOf();
            // // date not found and start less than first.
            // if (_records.length === 0 && startInRequest < new Date('2019/10/01').valueOf()) {
            //     _records = [{ timestamp: startInRequest }].concat(_records);
            // }
            //
            sampleData.push({ id: _id, data: _records });
          }
        });
      });

      // show loading
      setTimeout(() => {
        // sampleData.forEach((_d) => {
        //     _d.data.splice(5, 5);
        // });

        resolve(sampleData);
        // console.debug("data has been sent to graph!");
      }, 200);
    });
  }

  source = 'meter_interval';
}
