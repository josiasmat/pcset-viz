/*
Pitch-class set visualizer - Colors library
Copyright (C) 2024 Josias Matschulat

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
"use strict";


/**
 * @param {Number} n 
 * @param {Number} min_digits 
 * @return {String}
 */
function intToHex(n, min_digits = 1) {
    return Math.round(n).toString(16).toUpperCase().padStart(min_digits, '0');
}


class RGBAColor {

    r; g; b; a;

    constructor (r,g,b,a) {
        this.r = clamp(r,0,255);
        this.g = clamp(g,0,255);
        this.b = clamp(b,0,255);
        this.a = clamp(a,0,1);
    }

    /** @return {String} */
    get css_color() {
        return ['#',
            intToHex(Math.round(this.r), 2),
            intToHex(Math.round(this.g), 2),
            intToHex(Math.round(this.b), 2)
        ].join('');
    }

    /** @return {String} */
    get css_rgba() {
        return ['#',
            intToHex(Math.round(this.r), 2),
            intToHex(Math.round(this.g), 2),
            intToHex(Math.round(this.b), 2),
            intToHex(Math.round(this.a*255), 2)
        ].join('');
    }

    /** @return {String} */
    get css_opacity() {
        return clamp(this.a, 0, 1).toString();
    }

    /** @return {Number} */
    get alpha() {
        return this.a;
    }

}


/**
     * @param {Number} r - Red component, 0-255
     * @param {Number} g - Green component, 0-255
     * @param {Number} b - Blue component, 0-255
     * @returns {RGBAColor}
     */
function rgb(r,g,b) {
    return new RGBAColor(r,g,b,1);
}

/**
 * @param {Number} r - Red component, 0-255
 * @param {Number} g - Green component, 0-255
 * @param {Number} b - Blue component, 0-255
 * @param {Number} a - Opacity, 0-1
 * @returns {RGBAColor}
 */
function rgba(r,g,b,a) {
    return new RGBAColor(r,g,b,a);
}

/**
 * @param {Number} h - Hue component, angle in degrees (0-360)
 * @param {Number} s - Saturation component, 0-1
 * @param {Number} l - Lightness component, 0-1 (0.5 is "normal")
 * @param {Number} a - Opacity, 0-1
 * @returns {RGBAColor}
 */
function hsla(h,s,l,a) {
    while ( h < 0 ) h += 360;
    h %= 360;
    s = clamp(s, 0, 1);
    l = clamp(l, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - (c / 2);
    let r, g, b;
    if      ( h < 60  ) [r,g,b] = [c,x,0];
    else if ( h < 120 ) [r,g,b] = [x,c,0];
    else if ( h < 180 ) [r,g,b] = [0,c,x];
    else if ( h < 240 ) [r,g,b] = [0,x,c];
    else if ( h < 300 ) [r,g,b] = [x,0,c];
    else                [r,g,b] = [c,0,x];
    return rgba((r+m)*255, (g+m)*255, (b+m)*255, a);
}

/**
 * @param {Number} h - Hue component, angle in degrees (0-360)
 * @param {Number} s - Saturation component, 0-1
 * @param {Number} l - Lightness component, 0-1 (0.5 is "normal")
 * @returns {RGBAColor}
 */
function hsl(h,s,l) {
    return hsla(h,s,l,1);
}

function oklab2RGBA(L,a,b,alpha=1) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;

    const R = (+4.0767416621 * l) - (3.3077115913 * m) + (0.2309699292 * s);
    const G = (-1.2684380046 * l) + (2.6097574011 * m) - (0.3413193965 * s);
    const B = (-0.0041960863 * l) - (0.7034186147 * m) + (1.7076147010 * s);

    const f = (x) => ( x >= 0.0031308 ) ? (1.055 * x**(1.0/2.4) - 0.055) : (12.92 * x);
    return rgba(255 * f(R), 255 * f(G), 255 * f(B), alpha);
}

/**
 * LCh+alpha in Oklab colorspace to RGBColor converter.
 * @param {Number} h - Hue component, angle in degrees (0-360)
 * @param {Number} c - Chroma component, 0-1
 * @param {Number} l - Lightness component, 0-1 (0.5 is "normal")
 * @param {Number} a - Opacity, 0-1
 * @returns {RGBAColor}
 */
function lcha(l,c,h,a) {
    while ( h < 0 ) h += 360;
    h = degToRad(h % 360);
    return oklab2RGBA(l, c * Math.cos(h), c * Math.sin(h), a);
}

/**
 * LCh in Oklab colorspace to RGBColor converter.
 * @param {Number} h - Hue component, angle in degrees (0-360)
 * @param {Number} c - Chroma component, 0-1
 * @param {Number} l - Lightness component, 0-1 (0.5 is "normal")
 * @returns {RGBAColor}
 */
function lch(l,c,h) {
    return lcha(l,c,h,1);
}

function black(alpha=1) { return rgba(0,0,0,alpha); }
function white(alpha=1) { return rgba(255,255,255,alpha); }
function transparent() { return rgba(0,0,0,0); }
function nocolor() {
    return {
        r: 0, g: 0, b: 0, a: 0,
        css_color: "none",
        css_rgba: "none",
        css_opacity: "0"
    };
}