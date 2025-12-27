/*
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


const DIGITS = ['0','1','2','3','4','5','6','7','8','9'];
const HEX_DIGITS = DIGITS.concat(['A','a','B','b','C','c','D','d','E','e','F','f']);


/**
 * Generates consecutive numbers from _start_, stopping before _stop_.
 * @param {Number} start Number with which to start the generator.
 * @param {Number} stop Number _before_ which to end the generator.
 * @param {Number} step Optional; how much to increment each step. Default is
 *      _1_ if _stop_ > _start_, _-1_ otherwise.
 * @returns {Number[]}
 */
function* range(start, stop, step = (stop>start) ? 1 : -1) {
    if ( step > 0 && start < stop ) {
        while ( start < stop ) {
            yield start;
            start += step;
        }
    } else if ( step < 0 && start > stop ) {
        while ( start > stop ) {
            yield start;
            start += step;
        }
    }
}


/**
 * Creates an array with numbers starting at _start_ and stopping before _stop_.
 * @param {Number} start Number with which to start the generator.
 * @param {Number} stop Number _before_ which to end the generator.
 * @param {Number} step Optional; how much to increment each step. Default is
 *      _1_ if _stop_ > _start_, _-1_ otherwise.
 * @returns {Number[]}
 */
function rangeArray(start, stop, step = (stop>start) ? 1 : -1) {
    const array = [];
    if ( step > 0 && start < stop ) {
        while ( start < stop ) {
            array.push(start);
            start += step;
        }
    } else if ( step < 0 && start > stop ) {
        while ( start > stop ) {
            array.push(start);
            start += step;
        }
    }
    return array;
}


/**
 * Check if a number is in range [min,max], inclusive.
 * @param {Number} value 
 * @param {Number} min 
 * @param {Number} max 
 * @returns {Boolean}
 */
function minmax(value, min, max) {
    return ( (value >= min) && (value <= max) );
}


/**
 * Check if a number is between _floor_ and _ceiling_, non-inclusive.
 * @param {Number} value 
 * @param {Number} floor 
 * @param {Number} ceiling 
 * @returns {Boolean}
 */
function between(value, floor, ceiling) {
    return ( (value > floor) && (value < ceiling) );
}


/**
 * Returns _value_ if it is between _min_ and _max_, otherwise _min_ or _max_.
 * @param {Number} value Actual value.
 * @param {Number} min Minimum value, inclusive.
 * @param {Number} max Maximum value, inclusive.
 * @returns {Number}
 */
function clamp(value, min, max) {
    return (value < min) ? min : ( (value > max) ? max : value );
}


/**
 * Escapes special characters for HTML.
 * @param {String} s
 * @returns {String}
 */
function htmlEscape(s) {
    let i = s.length, r = [];
    while ( i-- ) {
        var c = s.charCodeAt(i);
        r[i] = ( !between(c,31,127) || "<>\\".includes(s[i]) )
            ? '&#'+c+';' : s[i];
    }
    return r.join('');
}

/**
 * @param {String} s
 * @returns {String}
 */
function htmlNonBreakingSpaces(s) {
    return s.replace(' ', "&nbsp;").replace('-', "&#8209;");
}


/**
 * Creates a HTML anchor.
 * @param {String} url Destination URL.
 * @param {Object} options An object that accepts the following properties:
 *      * _text_ : a string containing the visible text;
 *      * _id_ : a string containing the id attribute;
 *      * _target_ : a string containing the target attribute;
 *      * _classes_ : an array containing a list of classes (strings).
 * @returns {String} A HTML string of the anchor element.
 */
function makeAnchorStr(url, options = {} ) {
    const tx = options.text ?? url;
    const id = ( options.id )      ? ` id="${options.id}"` : "";
    const tg = ( options.target )  ? ` target="${options.target}"` : "";
    const cl = ( options.classes ) ? ` class="${options.classes.join(' ')}"` : "";
    return `<a${id}${cl} href="${url}"${tg}>${tx}</a>`;
}


/**
 * Returns the value that comes after a given value in an array. If the value
 * doesn't exist in the array, returns the first one.
 * @param {any} value 
 * @param {Array} array 
 * @returns {any}
 */
function nextOf(value, array) {
    let i = array.indexOf(value) + 1;
    if ( i == array.length ) i = 0;
    return array[i];
}


/**
 * @param {String} param 
 * @param {String} default_value Optional; default is "".
 * @returns {String}
 */
function getUrlQueryValue(param, default_value = "") {
    const result = new URLSearchParams(window.parent.location.search).get(param);
    return result ?? default_value;
}


/**
 * Returns all possible combinations of elements from an array as subarrays.
 * @param {any[]} array 
 * @returns {any[][]}
 */
function combinations(array = []) {
    const len = array.length;
    const result = [];
    function f(c = [], v = 0) {
        for ( let i = v; i < len; i++ )
            result.push( f(c.concat([array[i]]), i+1) );
        return c;
    }
    result.push(f([]));
    return result;
}


/**
 * Equivalent to Python's zip.
 * @returns {Array}
 */
function zip() {
    // from https://stackoverflow.com/questions/4856717/javascript-equivalent-of-pythons-zip-function
    var args = [].slice.call(arguments);
    var shortest = (args.length == 0) 
        ? [] : args.reduce( (a,b) => (a.length < b.length ) ? a : b );
    return shortest.map( (_,i) => args.map( (array) => array[i] ) );
}


/**
 * Return successive overlapping pairs taken from an array.
 * Equivalent to Python's pairwise.
 * @template T
 * @param {T[]} array 
 * @param {Boolean} last_first If _true_, pair the last item with the first one at the end.
 * @returns {[T,T][]}
 */
function pairwise(array, last_first = false) {
    const pairs = zip(array.slice(0,-1), array.slice(1));
    if ( last_first ) pairs.push([array.at(-1), array[0]]);
    return pairs;
}


/**
 * Return all possible combinations of 2 elements taken from an array.
 * @param {Array} array 
 * @returns {[any,any][]}
 */
function pairs(array) {
    const l = array.length;
    const result = [];
    for ( let i = 0; i < l; i++ )
        for ( let j = i+1; j < l; j++ )
            result.push([array[i], array[j]]);
    return result;
}


/**
 * Count the number of occurrences of each value in an array.
 * @param {any[]} array 
 * @returns {Object} Returns an object where the keys are the array members,
 *      and the values are the counts of each member.
 */
function arrayCountValues(array) {
    const counts = {};
    array.forEach(function (x) { counts[x] = (counts[x] || 0) + 1; });    
    return counts;
}


/**
 * Counts the number of occurrences of a specific value in an array.
 * @param {any[]} array 
 * @param {any} value 
 * @returns {Number}
 */
function arrayCountValue(array, value) {
    return array.reduce((sum, x) => (x == value) ? sum+1 : sum, 0);
}


/**
 * Check if two arrays have exactly the same elements, in the same order.
 * @param {any[]} a First array.
 * @param {any[]} b Second array.
 * @returns {Boolean} _true_ if the arrays are equal, _false_ otherwise.
 */
function arraysEqual(a, b) {
    if ( a.length != b.length ) return false;
    for ( let i of range(0, a.length) )
        if ( a[i] != b[i] ) return false;
    return true;
}


/**
 * Check if two arrays have only equal elements, even if they are not in the
 * same order and if there are repeated elements in one of them. That is, if
 * they can be reduced to the same set.
 * @param {any[]} a First array.
 * @param {any[]} b Second array.
 * @returns {Boolean} _true_ if the arrays have equal elements, _false_ otherwise.
 */
function arraysSameElements(a, b) {
    const set_a = new Set(a);
    const set_b = new Set(b);
    if ( set_a.size != set_b.size ) return false;
    for ( let item of set_a )
        if ( !set_b.has(item) )
            return false;
    return true;
}


/**
 * Makes a sorted copy of an array of numbers.
 * @param {Number[]} array 
 * @param {Boolean} reversed Optional; default is _false_.
 * @returns {Number[]} The sorted array.
 */
function sortedNumArray(array = [], reversed = false) {
    let sorted = Array.from(array);
    sorted.sort((a,b) => a - b);
    if ( reversed ) sorted.reverse();
    return sorted;
}


/**
 * Merges two objects, copying the properties of *source_obj* into *dest_obj*.
 * @param {Object} souce_obj Source object, from which to copy properties.
 * @param {Object} dest_obj Destination object, to which to copy properties.
 * @param {Boolean} merge_arrays If _true_, merge existing arrays; if _false_,
 *      follow _replace_ argument.
 * @param {Boolean} replace If _true_, replace existing properties with new 
 *      ones; if _false_, existing properties are kept intact.
 */
function mergeObjects(souce_obj, dest_obj, merge_arrays = false, replace = true) {
    for ( let entry of Object.entries(souce_obj) ) {
        if ( Object.hasOwn(dest_obj, entry[0]) ) {
            if ( Array.isArray(entry[1]) ) {
                if ( Array.isArray(dest_obj[entry[0]]) && merge_arrays )
                    dest_obj[entry[0]].push(...entry[1]);
                else if ( replace )
                    dest_obj[entry[0]] = entry[1];
            } else if ( typeof(entry[1]) === "object" )
                mergeObjects(entry[1], dest_obj[entry[0]]);
            else if ( replace )
                dest_obj[entry[0]] = entry[1];
        } else
            dest_obj[entry[0]] = entry[1];
    }
}


/**
 * Convert an angle in degrees to radians.
 * @param {Number} deg 
 * @returns {Number}
 */
function degToRad(deg) {
    return deg*(Math.PI/180);
}


/**
 * Recreates a node.
 * @param {Node} el Node to be replaced.
 * @param {Boolean} with_children
 * @returns {Node} The new node.
 */
function recreateNode(el, with_children = false) {
    if (with_children) {
        const newEl = el.cloneNode(true);
        el.parentNode.replaceChild(newEl, el);
        return newEl;
    }
    else {
        const newEl = el.cloneNode(false);
        while (el.hasChildNodes()) newEl.appendChild(el.firstChild);
        el.parentNode.replaceChild(newEl, el);
        return newEl;
    }
}


/**
 * Test if coordinates are inside a rect.
 * @param {DOMRect} rect 
 * @param {Number} x 
 * @param {Number} y 
 * @returns {Boolean}
 */
function isInsideRect(rect, x, y) {
    return ( x >= rect.left ) && ( x <= rect.right  )
        && ( y >= rect.top  ) && ( y <= rect.bottom );
}


function addOptionToHtmlSelect(select_element, value, label, selected = false) {
    const option = document.createElement("option");
    option.setAttribute("value", value);
    option.setAttribute("label", label);
    if ( selected ) option.setAttribute("selected", true);
    select_element.appendChild(option);
    return option;
}


function clearSelectOptions(select_element) {
    let L = select_element.options.length - 1;
    for( let i = L; i >= 0; i-- )
       select_element.remove(i);
}
 

/**
 * Returns a string representation of an array of numbers,
 * differentiating ranges and discrete values.
 * @param {Number[]} numbers - an array of numbers.
 * @param {String} discrete_sep - optional; default is a comma.
 * @param {String} range_sep - optional; default is a dash.
 * @returns {String}
 */
function integerRangesToStr(numbers, discrete_sep = ',', range_sep = '-') {
    if ( numbers.length == 0 ) return '';
    const ranges = [];
    let [a, b] = [numbers[0], numbers[0]];
    for ( let i = 1; i < numbers.length; i++ ) {
        if ( numbers[i] != b + 1 ) {
            ranges.push((a==b) ? b.toString() : [a,b].join(range_sep));
            a = numbers[i];
        }
        b = numbers[i];
    }
    ranges.push((a==b) ? b.toString() : [a,b].join(range_sep));
    return ranges.join(discrete_sep);
}


/**
 * @param {Number} n 
 * @returns {String}
 */
function romanize(n) {
    const ROMAN_DIGITS = [
        [1000,'M'], [900,'CM'], [500,'D'], [400,'CD'], [100,'C'], [90,'XC'],
        [50,'L'], [40,'XL'], [10,'X'], [9,'IX'], [5,'V'], [4,'IV'], [1,'I']
    ];
    let s = '';
    for ( let [v,d] of ROMAN_DIGITS ) {
        while ( n >= v ) {
            n -= v;
            s += d;
        }
    }
    return s;
}


/**
 * 
 * @param {Number} n 
 * @param {Number} min_digits 
 * @returns {String}
 */
function toBinary(n, min_digits = 0) {
    return n.toString(2).padStart(min_digits, '0');
}


/**
 * Makes a shallow copy of an object
 * @param {Object} obj - Source object
 * @param {String[]?} props - Names of properties to be excluded from copy
 * @returns {Object}
 */
function cloneObjectExcept(obj, props = []) {
    const clone = { ...obj };
    for (const p of props)
        delete clone[p];
    return clone;
}


/**
 * @param {Number} min - inclusive
 * @param {Number} max - exclusive
 * @returns {Number}
 */
function getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); 
}
