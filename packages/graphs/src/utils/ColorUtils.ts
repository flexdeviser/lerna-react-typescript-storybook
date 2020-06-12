export const RGB_COLOR_REGEX = /\((\d+),\s*(\d+),\s*(\d+)(,\s*(\d*.\d*))?\)/;

/**
 * color functions for graph
 */
export class FgpColor {
  public r = 0;
  public g = 0;
  public b = 0;
  public a = 1;

  constructor();
  constructor(r?: string);
  constructor(r?: string | number, g?: number, b?: number);
  constructor(r?: string | number, g?: number, b?: number, a?: number) {
    if (typeof r === 'string') {
      r = r.trim();
      if (r.indexOf('#') === 0) {
        r = r.substr(r.indexOf('#') + 1);
        this.r = parseInt(r.substr(0, 2), 16);
        this.g = parseInt(r.substr(2, 2), 16);
        this.b = parseInt(r.substr(4, 2), 16);
      } else if (r.indexOf('rgb') === 0) {
        const res: RegExpExecArray | null = RGB_COLOR_REGEX.exec(r);
        if (res) {
          this.r = parseInt(res[1], 10);
          this.g = parseInt(res[2], 10);
          this.b = parseInt(res[3], 10);
          this.a = res[5] ? parseFloat(res[5]) : 1;
        }
      }
    } else {
      this.r = r ? r : 0;
      this.g = g ? g : 0;
      this.b = b ? b : 0;
      this.a = a || 1;
    }
  }

  toHex(): string {
    return '#' + this.r.toString(16) + this.g.toString(16) + this.b.toString(16);
  }

  toRgb(): string {
    return `rgb(${this.r}, ${this.g}, ${this.b})`;
  }

  toRgba(): string {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }

  toRgbWithAlpha(a: number): string {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${a})`;
  }
}

export function hsvToRGB(hue: number, saturation: number, value: number): string {
  let red = 0;
  let green = 0;
  let blue = 0;
  if (saturation === 0) {
    red = value;
    green = value;
    blue = value;
  } else {
    const i = Math.floor(hue * 6);
    const f = hue * 6 - i;
    const p = value * (1 - saturation);
    const q = value * (1 - saturation * f);
    const t = value * (1 - saturation * (1 - f));
    switch (i) {
      case 1:
        red = q;
        green = value;
        blue = p;
        break;
      case 2:
        red = p;
        green = value;
        blue = t;
        break;
      case 3:
        red = p;
        green = q;
        blue = value;
        break;
      case 4:
        red = t;
        green = p;
        blue = value;
        break;
      case 5:
        red = value;
        green = p;
        blue = q;
        break;
      case 6: // fall through
      case 0:
        red = value;
        green = t;
        blue = p;
        break;
    }
  }
  red = Math.floor(255 * red + 0.5);
  green = Math.floor(255 * green + 0.5);
  blue = Math.floor(255 * blue + 0.5);
  return 'rgb(' + red + ',' + green + ',' + blue + ')';
}
