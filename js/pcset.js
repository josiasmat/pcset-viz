/*
Pitch-class set Javascript library
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

var PCSET_DEFAULT_BRACKETS = "[]";
var ICVEC_DEFAULT_BRACKETS = "<>";
var CTVEC_DEFAULT_BRACKETS = "<>";

const PCSET_TOKEN_MAP_SHORT_AB = "0123456789AB";
const PCSET_TOKEN_MAP_SHORT_TE = "0123456789TE";
const PCSET_TOKEN_MAP_NOTES_SHARPS = ["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];
const PCSET_TOKEN_MAP_NOTES_FLATS = ["C","D♭","D","E♭","E","F","G♭","G","A♭","A","B♭","B"];

/**
 * PcSet() recognizes both A,B and T,E for pitch-classes 10 and 11, respectively. 
 * By default, the str_compact() method outputs those pcs as A and B. But, if you 
 * want to make it output T and E, change variable PCSET_CHAR_MAP to "0123456789TE". 
 * As you can see, it is actually possible use other characters as well, even in 
 * place of the digits.
 */
var PCSET_CHAR_MAP = Array.from(PCSET_TOKEN_MAP_SHORT_AB);

class PcSet {

    /** @type {Number[]} */
    #data = [];

    /** @type {Number} */
    #binv;

    static #cache = {};

    /**
     * @param {Number} binv 
     * @param {String} type 
     * @returns {Boolean}
     */
    static #cacheHas(binv, type) {
        return Object.hasOwn(PcSet.#cache, binv) 
           && !Object.hasOwn(PcSet.#cache[binv], type);
    }

    /**
     * @param {Number} binv 
     * @param {String} type 
     * @param {any} value 
     * @returns {any}
     */
    static #cacheWrite(binv, type, value) {
        if ( !Object.hasOwn(PcSet.#cache, binv) )
            PcSet.#cache[binv] = {};
        PcSet.#cache[binv][type] = value;
        return value;
    }

    /**
     * @param {Number} binv 
     * @param {String} type 
     * @returns {any|null}
     */
    static #cacheRead(binv, type) {
        if ( PcSet.#cacheHas(binv, type) )
            return PcSet.#cache[binv][type];
        return null;
    }

    /** @param {Number} binv */
    static #cacheInvalidate(binv) {
        PcSet.#cache[binv] = {};
    }

    static cacheGet() {
        return PcSet.#cache;
    }

    static cacheClear() {
        PcSet.#cache = {};
    }

    /**
     * Constructs a new PcSet object.
     * @param {Number[]|String} [arg] An optional source for the set, which
     *      can be an array of pitches or pitch-classes, or a string containing
     *      a list of pitch-classes.
     */
    constructor(arg = []) {
        if ( typeof(arg) == "string" ) {
            if ( substrFoundInStr(arg, [" ",",",";"]) )
                this.#parseStringLong(arg);
            else
                this.#parseStringCompact(arg);
        } else if ( Array.isArray(arg) ) {
            for ( const n of arg ) {
                if ( typeof(n) == "number" )
                    this.#data.push(mod12(Math.trunc(n)));
            }
        }
        this.#removeDuplicates();
        this.#sortFromFirst();
    }

    static generate(count, interval, first = 0) {
        const pcs = [];
        for ( let i = 0; i < count; i++ ) {
            pcs.push(mod12((interval*i)+first));
        }
        return new PcSet(pcs);
    }

    [Symbol.iterator]() {
        let index = 0;
        return {
            next: () => {
                if ( index == this.size )
                    return { done: true };
                return { value: this.#data[index++], done: false };
            },
        };
    };

    #removeDuplicates() {
        for ( let i = this.#data.length - 2; i > -1; i-- ) {
            for ( let j = this.#data.length - 1; j > i; j-- ) {
                if ( this.#data[j] == this.#data[i] )
                    this.#data.splice(j, 1);
            }
        }
    }

    #sortFromFirst() {
        if (this.size > 1) {
            const first = this.#data[0];
            this.#data.sort( (a,b) => mod12(a-first) - mod12(b-first) );
        }
    }

    #sortAscending() {
        if (this.size > 1)
            this.#data.sort( (a,b) => a - b );
    }

    #parseStringCompact(s) {
        for ( const c of s ) {
            if ( c >= "0" && c <= "9" )
                this.#data.push(c-"0");
            else if ("AaTt".includes(c))
                this.#data.push(10);
            else if ("BbEe".includes(c))
                this.#data.push(11);
            else if (c == "[")
                this.#data = [];
            else if (c == "]")
                return;
            else if (c == " ")
                continue;
            else
                return false;
        }
        return true;
    }

    #parseStringLong(s) {
        // tokenize
        const separators = " ,;";
        let tokens = [];
        let next_token = "";
        for ( const c of s.toLowerCase() ) {
            if ( "([{}])".includes(c) )
                continue;
            if ( separators.includes(c) && next_token != "" ) {
                tokens.push(next_token);
                next_token = "";
            } else {
                next_token += c;
            }
        }
        if ( next_token != "" ) tokens.push(next_token);
        // parse
        const notes = "abcdefg";
        const acc_sharps = "#♯+";
        const acc_flats = "b♭-";
        const accidentals = acc_sharps + acc_flats;
        for ( const token of tokens ) {
            if ( !isNaN(token) )
                this.#data.push(mod12(parseInt(token)));
            else if ( token.length == 1 && notes.includes(token) )
                this.#data.push("c d ef g a b".indexOf(token));
            else if ( token == "h" )
                this.#data.push(11);
            else if ( token.length == 2 ) {
                if ( notes.includes(token[0]) && accidentals.includes(token[1]) ) {
                    if ( acc_sharps.includes(token[1]) )
                        this.#data.push("bc d ef g a".indexOf(token[0]));
                    else if ( acc_flats.includes(token[1]) )
                        this.#data.push(" d ef g a bc".indexOf(token[0]));
                } else if ( notes.includes(token[1]) && accidentals.includes(token[0]) ) {
                    if ( acc_sharps.includes(token[0]) )
                        this.#data.push("bc d ef g a".indexOf(token[1]));
                    else if ( acc_flats.includes(token[0]) )
                        this.#data.push(" d ef g a bc".indexOf(token[1]));
                } else
                    console.log(`Unrecognized token: "${token}".`);
            } else
                console.log(`Unrecognized token: "${token}".`);
        }
    }

    get #left_bracket() {
        return PCSET_DEFAULT_BRACKETS.charAt(0);
    }

    get #right_bracket() {
        return PCSET_DEFAULT_BRACKETS.charAt(1);
    }

    #encloseStr(s) {
        return this.#left_bracket + s + this.#right_bracket;
    }

    /**
     * Returns a deep-copy of this PcSet object.
     * @returns {PcSet}
     */
    clone() {
        return new PcSet(this.#data);
    }

    // PROPERTIES

    /** The number of pitch-classes in the set. @returns {Number} */
    get size() {
        return this.#data.length;
    }

    /** The number of pitch-classes in the set.
     * @returns {Number}
     * @alias size 
     */ 
    get cardinality() {
        return this.size;
    }

    /** The first pitch-class in the set. @returns {Number} */
    get head() {
        return ( this.isEmpty() ) ? null : this.#data[0];
    }

    /** The last pitch-class in the set. @returns {Number} */
    get tail() {
        const len = this.size;
        return ( len == 0 ) ? null : this.#data[len-1];
    }

    /** @returns {Boolean} */
    isMaximallyEven() {
        if ( [0,1].includes(this.size) )   return false;
        if ( [11,12].includes(this.size) ) return true;
        const cache_key = "maximally_even";
        const cached = PcSet.#cacheRead(this.binary_value, cache_key);
        if ( cached ) return cached;
        for ( let d = 1; d < this.size; d++ ) {
            const first_interval = computeInterval(this.#data[0], this.#data[d]);
            let [min,max] = [first_interval,first_interval];
            for ( let i = 1; i < this.size; i++ ) {
                const j = (i+d) % this.size;
                const interval = computeInterval(this.#data[i], this.#data[j]);
                [min,max] = [Math.min(min,interval), Math.max(max,interval)];
            }
            if ( max-min > 1 ) 
                return PcSet.#cacheWrite(this.binary_value, cache_key, false);
        }
        return PcSet.#cacheWrite(this.binary_value, cache_key, true);
    }

    /** @returns {Boolean} */
    isDeepScale() {
        const cache_key = "deep_scale";
        const cached = PcSet.#cacheRead(this.binary_value, cache_key);
        if ( cached ) return cached;
        const icv = this.icvector();
        for ( let [a,b] of pairs(icv.data) ) {
            if ( a == b ) 
                return PcSet.#cacheWrite(this.binary_value, cache_key, false);
        }
        return PcSet.#cacheWrite(this.binary_value, cache_key, true);;
    }

    hasMyhillProperty() {
        if ( this.size < 3 ) return false;
        const cache_key = "myhill";
        const cached = PcSet.#cacheRead(this.binary_value, cache_key);
        if ( cached ) return cached;
        for ( let d = 1; d < this.size; d++ ) {
            let c = new Set();
            for ( let i = 0; i < this.size; i++ )
                c.add(computeIntervalClass(this.at(i), this.at(i+d)));
            if ( c.size != 2 ) 
                return PcSet.#cacheWrite(this.binary_value, cache_key, false);
        }
        return PcSet.#cacheWrite(this.binary_value, cache_key, true);
    }

    /** 
     * @param {Number} interval
     * @returns {Boolean} 
     */
    isGenerated(interval) {
        if ( this.size < 3 ) return false;
        const cache_key = `generated(${interval})`;
        const cached = PcSet.#cacheRead(this.binary_value, cache_key);
        if ( cached ) return cached;
        for ( let i = 0; i < this.size; i++ ) {
            if ( this.isSameSetClass(PcSet.generate(this.size, interval, this.at(i))) )
                return PcSet.#cacheWrite(this.binary_value, cache_key, true);
        }
        return PcSet.#cacheWrite(this.binary_value, cache_key, false);
    }

    /** @returns {Number[]} */
    getGenerators() {
        const generators = [];
        for ( let i = 0; i < 6; i++ )
            if ( this.isGenerated(i) ) generators.push(i);
        return generators;
    }

    /** 
     * Returns the pitch-class set at given index. Accepts negative indexes.
     * @param {Number} index
     * */
    at(index) {
        return this.#data[mod(index, this.size)];
    }

    /**
     * Returns the index of the given pitch-class inside the set, or -1 if
     *      the pitch-class is not a member of the set.
     * @param {Number} pc A pitch-class.
     * @returns {Number}
     */
    indexOf(pc) {
        return this.#data.indexOf(pc);
    }

    /**
     * Returns the interval class vector of the set.
     * @returns {IntervalClassVector}
     */
    icvector() {
        const cached = PcSet.#cacheRead(this.binary_value, "icv");
        return cached ?? PcSet.#cacheWrite(this.binary_value, "icv", IntervalClassVector.from_pcset(this));
    }

    /**
     * Returns the common-tone vector of the set.
     * @returns {CommonToneVector}
     */
    ctvector() {
        const cached = PcSet.#cacheRead(this.binary_value, "ctv");
        return cached ?? PcSet.#cacheWrite(this.binary_value, "ctv", CommonToneVector.from_pcset(this));
    }

    /** The binary value of the set, which corresponds to the sum of the
     *      powers of two of every member of the set. This gives unique values
     *      for all possible unordered pitch-class sets.
     */
    get binary_value() {
        if ( !this.#binv ) this.#updateBinaryValue();
        return this.#binv;
    }

    #updateBinaryValue() {
        this.#binv = this.#data.reduce((sum, pc) => sum + (2**pc), 0);
    }

    /** 
     * Returns a new array containing the pitch-classes of this set.
     * @returns {Number[]}
     */
    toArray() {
        return Array.from(this.#data);
    }

    /** @returns {Boolean} _true_ if the set is empty. */
    isEmpty() {
        return this.size == 0;
    }

    /** 
     * @returns {Boolean} _true_ if the set has a distinct inverse,
     *      i.e. if the set is *not* a mirror.
     */
    hasDistinctInverse() {
        return ( this.#getCatalogEntry().inv );
    }

    /**
     * @returns {Boolean} _true_ if the set is a mirror, i.e. if
     *      the set has no distinct inverse.
     */
    isMirror() {
        return ( !this.isEmpty() && !this.hasDistinctInverse() );
    }

    // COMPARISON AND SEGMENTATION

    /**
     * Compares the set to another set, returning _true_ if they have the
     * same members in the same order.
     * To compare set classes, use *set.isSameSetClass(other)*.
     * @param {PcSet} other 
     * @returns {Boolean}
     */
    isEqualTo(other) {
        if ( this.size != other.size ) return false;
        for ( let i = this.size-1; i >= 0; i-- )
            if ( this.at(i) != other.at(i) )
                return false;
        return true;
    }

    /**
     * Compares the set to another set, returning _true_ if they have
     * the same members, irrespective of ordering.
     * @param {PcSet} other 
     * @returns {Boolean}
     */
    isSameSetClass(other) {
        return ( this.size == other.size && this.isSupersetOf(other) );
    }

    isSupersetOf(other) {
        for ( const pc of other ) {
            if ( ! this.has(pc) )
                return false;
        }
        return true;
    }

    isSubsetOf(other) {
        return other.isSupersetOf(this);
    }

    getSegmentIndex(other) {
        if ( other.size > this.size ) return -1;
        const head_index = this.indexOf(this.head);
        if ( head_index == -1 ) return -1;
        const len_this = this.size;
        const len_other = other.size;
        for ( let i = 0; i < len_other; i++ ) {
            if ( other.at(i) != this.at(mod(i+head_index, len_this)) )
                return -1;
        }
        return head_index;
    }

    hasSegment(other) {
        return this.getSegmentIndex(other) != -1;
    }

    isSegmentOf(other) {
        return other.hasSegment(this);
    }

    // STRING REPRESENTATION

    /**
     * Returns a string representation of the set.
     * @param {String} format Optional. Accepted values are: "short-ab" (default),
     *      "short-te", "numbers", "notes-sharps", "notes-flats".
     * @param {Boolean} include_brackets Optional; default is _true_.
     * @returns {String}
     */
    toString(format = "short-ab", include_brackets = true) {
        switch ( format.toLowerCase() ) {
            case "short-ab":
                return this.#strCompact(include_brackets, PCSET_TOKEN_MAP_SHORT_AB);
            case "short-te":
                return this.#strCompact(include_brackets, PCSET_TOKEN_MAP_SHORT_TE);
            case "numbers":
                return this.#strNumbers(include_brackets);
            case "notes-sharps":
                return this.#strFromMap(PCSET_TOKEN_MAP_NOTES_SHARPS, include_brackets);
            case "notes-flats":
                return this.#strFromMap(PCSET_TOKEN_MAP_NOTES_FLATS, include_brackets);
            default:
                return this.#strNumbers(include_brackets);
        }
    }

    /** @returns {String} */
    #strCompact(include_brackets = false, char_map = PCSET_CHAR_MAP) {
        const s = this.#data.map((x) => char_map[x]).join("");
        return (include_brackets) ? this.#encloseStr(s) : s;
    }

    /** @returns {String} */
    #strNumbers(include_brackets = false) {
        const s = this.#data.map((x) => x.toString()).join(",");
        return (include_brackets) ? this.#encloseStr(s) : s;
    }

    /** @returns {String} */
    #strFromMap(map, include_brackets) {
        const s = this.#data.map((x) => map[x]).join(",");
        return (include_brackets) ? this.#encloseStr(s) : s;
    }

    // INDIVIDUAL PITCH CLASS OPERATIONS

    /**
     * Check if set has the specified pitch class.
     * @param {Number} pitch Pitch or pitch-class number. 
     * @returns {Boolean}
     */
    has(pitch) {
        return this.#data.includes(mod12(pitch));
    }

    /**
     * Adds the specified pitch-class to the set.
     * @param  {Number} pc Pitch-class number.
     * @return {Boolean} _true_ if pitch-class was added; false if it was already 
     *      a member of the set.
     */
    add(pc) {
        if ( this.has(pc) ) return false;
        this.#data.push(pc);
        this.#sortFromFirst();
        this.#updateBinaryValue();
        return true;
    }

    /**
     * Removes the specified pitch-class from the set.
     * @param  {Number} pc Pitch-class number.
     * @return {Boolean} Returns _true_ if pitch-class was removed; _false_ if the 
     *      pitch-class was not a member of the set.
     */
    remove(pc) {
        const i = this.#data.indexOf(pc);
        if ( i == -1 ) return false;
        this.#data.splice(i, 1);
        this.#updateBinaryValue();
        return true;
    }

    /**
     * Adds the specified pitch-class to the set if it is not a member of the
     * set; otherwise removes the pitch-class from the set.
     * @param  {Number} pc Pitch-class number.
     */
    toggle(pc) {
        this.remove(pc) || this.add(pc);
        //if ( !this.remove(pc) ) this.add(pc);
    }

    /**
     * Moves a pitch-class of the set to a new pitch-class.
     * @param  {Number} from Pitch-class to move from.
     * @param  {Number} to   Pitch-class to move to.
     * @return {Boolean} Returns _true_ if movement is done; _false_ if movement is not
     *      possible, either because _from_ is not a member of the set, or _to_ is
     *      already a member of the set.
     */
    moveTo(from, to) {
        return !this.has(to) && this.remove(from) && this.add(to);
    }

    /**
     * Moves a pitch-class of the set to a new pitch-class by a specified interval.
     * @param  {Number} pc Pitch-class to move from.
     * @param  {Number} interval Interval by which to move the pitch; a positive number
     *      indicates an ascending interval, while a negative number indicates a 
     *      descending interval.
     * @return {Boolean} Returns _true_ if movement is done; _false_ if movement is not
     *      possible, either because _pc_ is not a member of the set, or if _interval_
     *      takes to a pitch-class that is already a member of the set.
     */
    moveBy(pc, interval) {
        return this.moveTo(pc, mod12(pc+interval));
    }

    // TRANSFORMATIONS

    /**
     * Returns a new PcSet object which is the inversion of the original one.
     * @param  {Number} index Optional; the inversion's index. Defaults to 0.
     * @return {PcSet} Returns a new PcSet object with the inverted set.
     */
    invert(index = 0) {
        return new PcSet( this.#data.map((x) => mod12(index-x)) ).normal;
    }

    /**
     * Returns a new PcSet object which is a transposition of the original one.
     * @param  {Number} n The number of semitones by which to transpose. Positive and 
     *      negative numbers allowed.
     * @return {PcSet} Returns a new PcSet object with the transposed set.
     */
    transpose(n) {
        return new PcSet( this.#data.map((x) => mod12(x+n)) );
    }

    /**
     * Returns a new PcSet object which is the result of the multiplication of the 
     * original pitch-classes by a specified factor.
     * @param  {Number} n The factor by which to multiply the original pitch-classes.
     * @return {PcSet} Returns a new PcSet object with the multiplied set.
     */
    multiply(n) {
        return new PcSet( this.#data.map((x) => mod12(x*n)) );
    }

    /**
     * Returns a new PcSet object which is a rotation of the original one by a specified
     * number of members.
     * @param  {Number} n The number of pitches by which to shift the set. Positive
     *      numbers shift the set clockwise (moving members from the beginning to the
     *      end), negative numbers shift the set counter-clockwise (moving members 
     *      from the end to the beginning).
     * @return {PcSet} Returns a new PcSet object with the shifted set.
     */
    shifted(n) {
        return this.segment(this.size, n);
    }

    shiftedTo(pc) {
        const i = this.indexOf(pc)
        if ( i != -1 )
            return this.shifted(i);
    }

    shift(n) {
        if ( this.size > 1 ) {
            if ( n >=  0 ) {
                for ( let i = 0; i < n; i++ )
                    this.#data.push(this.#data.shift());
            } else {
                for ( let i = 0; i > n; i-- )
                    this.#data.unshift(this.#data.pop());
            }
        }
    }

    shiftTo(pc) {
        const i = this.indexOf(pc);
        if ( i != -1 )
            this.shift(i);
    }

    /**
     * Finds the operation which transforms _other_ into this PcSet.
     * @param {PcSet} other 
     * @returns {[String, Number] | null} a 2-element array, where the first is 
     *      a string containing the operation type ('T' or 'I'), and the 
     *      second is the operation index.
     */
    findTransformFrom(other) {
        // find transposition
        const transpositions = other.getTranspositions(false);
        for ( const trn of transpositions )
            if ( this.isSupersetOf(trn[1]) )
                return ['T', trn[0]];
        // find inversion
        const inversions = other.getInversions();
        for ( const inv of inversions )
            if ( this.isSupersetOf(inv[1]) )
                return ['I', inv[0]];
        return null;
    }

    /**
     * Returns a new PcSet object which is a segment of the original one.
     * @param {Number} length The number of elements from the segment.
     * @param {Number} start  Optional; the element index from which to start the
     *      segment. Default is 0.
     * @return {PcSet} Returns a new PcSet object with the extracted segment.
     */
    segment(length, start = 0) {
        const set_len = this.size;
        if (length > set_len) length = set_len;
        let i = mod(start, set_len);
        let seg = [];
        for ( let count = 0; count < length; count++ ) {
            if (i == set_len) i -= set_len;
            seg.push(this.#data[i++]);
        }
        return new PcSet(seg);
    }

    /**
     * A new PcSet object which is the complement of the original one.
     * @return {PcSet}
     */
    get complement() {
        let comp = [];
        for ( let pc = 0; pc < 12; pc++ )
            if ( ! this.#data.includes(pc) )
                comp.push(pc);
        return new PcSet(comp).normal;
    }

    /**
     * A new PcSet object in which the elements are transposed so that the first
     * one is zero.
     * @return {PcSet}
     */
    get zero() {
        return this.transpose(0 - this.head);
    }

    /**
     * A new PcSet object which is the normal form of the original one.
     * @return {PcSet}
     */
    get normal() {
        const cache_key = "nrm";
        const cached = PcSet.#cacheRead(this.binary_value, cache_key);
        if ( cached ) return new PcSet(cached);
        
        const len = this.size;
        if ( len < 2 ) return this.clone();
        const initial = this.clone();
        initial.#sortAscending();
        let best = initial.clone();
        let ambitus = computeInterval(best.head, best.tail);
        let binv = best.zero.binary_value;
        for ( let n = 1; n < len; n++ ) {
            const candidate = initial.shifted(n);
            const cand_ambt = computeInterval(candidate.head, candidate.tail);
            const cand_binv = candidate.zero.binary_value;
            if ( (cand_ambt < ambitus) || ( cand_ambt == ambitus && cand_binv < binv) ) {
                best = candidate;
                ambitus = cand_ambt;
                binv = cand_binv;
            }
        }

        PcSet.#cacheWrite(this.binary_value, cache_key, best.#data);
        return best;
    }

    /**
     * A new PcSet object which is the normal form transposed so that the first
     * element is zero.
     * @return {PcSet}
     */
    get reduced() {
        const cache_key = "red";
        const cached = PcSet.#cacheRead(this.binary_value, cache_key);
        if ( cached ) return new PcSet(cached);
        const result = this.normal.zero;
        PcSet.#cacheWrite(this.binary_value, cache_key, result.#data);
        return result;
    }

    /**
     * A new PcSet object which is the prime form of the original one.
     * @return {PcSet}
     */
    get prime() {
        const cache_key = "prm";
        const cached = PcSet.#cacheRead(this.binary_value, cache_key);
        if ( cached ) return new PcSet(cached);

        const original = this.reduced;
        const inverted = this.invert().reduced;
        const primed = (original.binary_value <= inverted.binary_value) ? original : inverted;
        PcSet.#cacheWrite(this.binary_value, cache_key, primed.#data);
        return primed;
    }

    /** @returns {Object} */
    #getCatalogEntry() {
        return PCSET_CATALOG[this.size][this.prime.#strCompact(true, PCSET_TOKEN_MAP_SHORT_AB)];
    }

    /** @returns {String} */
    #getForteName(ab = false) {
        const entry = this.#getCatalogEntry();
        if ( ab && entry.inv )
            return entry.fn + ( this.prime.isEqualTo(this.reduced) ? 'A' : 'B' );
        else 
            return entry.fn;
    }

    /** Forte/Morris name of the set. @returns {String} */
    get forte_name() {
        return this.#getForteName(false);
    }

    /** 
     * Forte/Morris name of the set, appending 'A' to sets that have distinct
     * inverses and 'B' to ones that are inverses of prime sets.
     * @returns {String} 
     */
    get forte_name_ab() {
        return this.#getForteName(true);
    }

    /** Carter number of the set. @returns {Number} */
    get carter_number() {
        const entry = this.#getCatalogEntry();
        return entry.cn;
    }

    /** Z-correspondent of the set, or _null_. @returns {PcSet | null} */
    get zcorrespondent() {
        const entry = this.#getCatalogEntry();
        const zc = (entry) ? entry.zc : null;
        return (zc) ? new PcSet(zc) : null;
    }

    // SYMMETRIES

    /**
     * Returns an array representing the levels of transpositional symmetry of the set;
     * that is, the transpositions by which the set maps onto itself. Each array member
     * is a number which indicates a level of symmetry.
     * @param {Boolean} include_zero Optional; true by default, since T(0) always maps
     *      any set onto itself. Set it to false to exclude level zero from the result.
     * @return {Array} Returns an array of numbers representing the levels of 
     *      transpositional symmetry of the set.
     */
    getTranspositionalEquivalents(include_zero = true) {
        const icvec = this.icvector();
        const pcslen = this.size;
        let sym = [];
        if ( this.size > 0 ) {
            if ( include_zero ) sym.push(0);
            for ( let i = 1; i < 6; i++ ) {
                if ( icvec.at(i) == pcslen )
                    for ( let n = i; n < 12; n+=i )
                        if ( !sym.includes(n) )
                            sym.push(n);
            }
            if ( 2*icvec.at(6) == pcslen && !sym.includes(6)) sym.push(6);
            sym.sort((a,b) => a-b);
        }
        return sym;
    }

    getTranspositionalEquivalenceIndexes(include_zero = true) {
        const symmetries = this.getTranspositionalEquivalents(include_zero);
        let axes = [];
        for ( let sym of symmetries ) {
            for ( let b = sym; b < 12; b+= sym ) {
                const new_axis = new Axis(b-sym, b);
                let unique = true;
                for ( let existent_axis of axes ) {
                    if ( new_axis.equal_to(existent_axis) ) {
                        unique = false;
                        break;
                    }
                }
                if ( unique ) axes.push(new_axis);
            }
        }
        return axes;
    }

    /**
     * Returns the number of levels of transpositional symmetry of the set; that is, 
     * the transpositions by which the set maps onto itself.
     * @param {Boolean} include_zero Optional; true by default, since T(0) always maps
     *      any set onto itself. Set it to false to exclude level zero from the count.
     * @return {Number} Returns the number of levels of transpositional symmetry of the set.
     */
    getTranspositionalSymmetryDegree(include_zero = true) {
        return this.icvector().count_value(this.size, true);
        //return this.t_symmetries(include_zero).length;
    }

    getInversionalSymmetries() {
        const ctvec = this.ctvector();
        const pcslen = this.size;
        let sym = [];
        if ( this.size > 0 ) {
            for ( let i = 0; i < 12; i++ )
                if ( ctvec.at(i) == pcslen )
                    sym.push(i);
        }
        return sym;
    }

    getInversionalSymmetryAxes() {
        return this.getInversionalSymmetries().map((x) => {return new Axis(x/2)});
    }

    getInversionalSymmetryDegree() {
        return this.ctvector().count_value(this.size);
    }

    // OPERATIONS WITH OTHER SETS

    /**
     * Returns a new set which is the result of a union operation between two sets.
     * A union results in a new set composed of the members of both sets.
     * @param {PcSet} other The set with which to execute the union operation.
     * @return {PcSet} Returns a new set which is the result of the union operation.
     */
    union(other) {
        let new_array = Array.from(this.#data);
        for ( const pc of other )
            new_array.push(pc);
        return new PcSet(new_array).normal;
    }

    /**
     * Returns a new set which is the result of an intersection operation between two 
     * sets. An intersection results in a new set composed only by the members common
     * to both sets. Also called a common-tone set.
     * @param {PcSet} other The set with which to execute the intersection operation.
     * @return {PcSet} Returns a new set which is the result of the intersection 
     *      operation.
     */
    intersection(other) {
        let new_array = [];
        for ( const pc of this )
            if ( other.has(pc) )
                new_array.push(pc);
        return new PcSet(new_array).normal;
    }

    /**
     * Returns a new set which is the result of a difference operation between two sets.
     * A difference operation results in a new set composed by the members of the first
     * set (the set from which the operation is called), excluding the members of the
     * second set (given by the _other_ parameter).
     * @param {PcSet} other The set with which to execute the difference operation.
     * @return {PcSet} Returns a new set which is the result of the difference operation
     *      of the original set excluding the members of the _other_ set.
     */
    difference(other) {
        let new_array = Array.from(this.#data);
        for ( const pc of other ) {
            const i = new_array.indexOf(pc);
            if ( i != -1 )
                new_array.splice(i, 1);
        }
        return new PcSet(new_array).normal;
    }

    symDifference(other) {
        return this.union(other).difference(this.intersection(other));
    }

    // COLLECTIONS OF SET TRANSFORMATIONS

    /**
     * TaggedSetCollection
     * @typedef {[Number[], PcSet][]} TaggedSetCollection
     */

    /**
     * Utility function to remove duplicated sets.
     * @param {PcSet[]} sets An array of PcSets.
     */
    static #filterUnique(sets, normalize = true) {
        if ( normalize ) {
            for ( let i = 0; i < sets.length-1; i++ ) {
                const set_i_normal = sets[i].normal;
                for ( let j = sets.length-1; j > i; j-- ) {
                    if ( set_i_normal.size != sets[j].size ) continue;
                    if ( set_i_normal.isEqualTo(sets[j].normal) ) {
                        sets.splice(j, 1);
                    }
                }
            }
        } else {
            for ( let i = 0; i < sets.length-1; i++ ) {
                const set_i = sets[i];
                for ( let j = sets.length-1; j > i; j-- ) {
                    if ( set_i.size != sets[j].size ) continue;
                    if ( set_i.isEqualTo(sets[j]) ) {
                        sets.splice(j, 1);
                    }
                }
            }
        }
    }

    /**
     * Utility function to remove duplicated sets.
     * @param {[Number[], PcSet][]} tagged_sets An array of tagged PcSets, where each
     *      item is a 2-item array where the first item is a tag and the second
     *      item is the PcSet object.
     * @returns {[Number[], PcSet][]}
     */
    static #filterUniqueTagged(tagged_sets) {
        for ( let i = 0; i < tagged_sets.length-1; i++ ) {
            const set_i_normal = tagged_sets[i][1].normal;
            for ( let j = tagged_sets.length-1; j > i; j-- ) {
                if ( set_i_normal.size != tagged_sets[j][1].size ) continue;
                if ( set_i_normal.isEqualTo(tagged_sets[j][1].normal) ) {
                    for ( const n of tagged_sets[j][0] )
                        tagged_sets[i][0].push(n);
                    tagged_sets.splice(j, 1);
                }
            }
        }
        for ( let set of tagged_sets )
            set[0].sort((a,b) => a-b);
    }

    /**
     * @param {Boolean} include_zero 
     * @returns {[Number[], PcSet][]}
     */
    getTranspositions(include_zero = true) {
        let sets = [];
        for ( let n = (include_zero ? 0 : 1); n < 12; n++ )
            sets.push([[n], this.transpose(n)]);
        return sets;
    }

    /**
     * @param {Boolean} include_zero 
     * @returns {[Number[], PcSet][]}
     */
    getTranspositionsUnique(include_zero = true) {
        let sets = this.getTranspositions(include_zero);
        PcSet.#filterUniqueTagged(sets);
        return sets;
    }

    /**
     * @param {Boolean} include_zero 
     * @returns {[Number[], PcSet][]}
     */
    getCtts(include_zero = true) {
        let sets = this.getTranspositions(include_zero)
            .map( (item) => [item[0],item[1].intersection(this)] );
        return sets;
    }

    /**
     * @param {Boolean} include_zero 
     * @returns {[Number[], PcSet][]}
     */
    getCttsUnique(include_zero = true) {
        let sets = this.getCtts(include_zero);
        PcSet.#filterUniqueTagged(sets);
        return sets;
    }

    /**
     * @param {Boolean} include_zero 
     * @returns {[Number[], PcSet][]}
     */
    getTranspositionallyEquivalentSets(include_zero = true) {
        let sets = this.getTranspositionalEquivalents(include_zero).map((n) => [[n], this.transpose(n)]);
        PcSet.#filterUniqueTagged(sets);
        return sets;
    }
    
    /**
     * @returns {[Number[], PcSet][]}
     */
    getInversions() {
        let sets = [];
        for ( let n = 0; n < 12; n++ )
            sets.push([[n], this.invert(n)]);
        return sets;
    }

    /**
     * @returns {[Number[], PcSet][]}
     */
    getInversionsUnique() {
        let sets = this.getInversions();
        PcSet.#filterUniqueTagged(sets);
        return sets;
    }
    
    /**
     * @returns {[Number[], PcSet][]}
     */
    getCtis() {
        let sets = this.getInversions()
            .map( (item) => [item[0],item[1].intersection(this)] );
        return sets;
    }

    /**
     * @returns {[Number[], PcSet][]}
     */
    getCtisUnique() {
        let sets = this.getCtis();
        PcSet.#filterUniqueTagged(sets);
        return sets;
    }

    /**
     * @returns {[Number[], PcSet][]}
     */
    getInversionallySymmetricSets() {
        let sets = this.getInversionalSymmetries().map((n) => [[n], this.invert(n)]);
        PcSet.#filterUniqueTagged(sets);
        return sets;
    }

    /**
     * @returns {[Number[], PcSet][]}
     */
    getRotations(include_zero = true) {
        let sets = [];
        for ( let n = (include_zero ? 0 : 1); n < this.size; n++ )
            sets.push([[n], this.shifted(n)]);
        return sets;
    }

    /**
     * @param {Boolean} include_zero 
     * @returns {[Number[], PcSet][]}
     */
    getMultiples(include_zero = true) {
        let sets = [];
        for ( let n = (include_zero ? 0 : 1); n < 12; n++ )
            sets.push([[n], this.multiply(n)]);
        return sets;
    }

    /**
     * @param {Boolean} include_zero 
     * @returns {[Number[], PcSet][]}
     */
    getMultiplesUnique(include_zero = true) {
        let sets = this.getMultiples(include_zero);
        PcSet.#filterUniqueTagged(sets);
        return sets;
    }

    /**
     * @param {Number} min_size 
     * @param {Number} max_size 
     * @returns {PcSet[]}
     */
    getSubsets(min_size = 0, max_size = this.size) {
        let sets = [];
        const arrays = PcSet.#combinations(this.#data);
        for ( const array of arrays )
            if ( array.length >= min_size && array.length <= max_size )
                sets.push(new PcSet(array));
        sets.sort((a,b) => a.size - b.size);
        return sets;
    }

    /**
     * @param {Number} min_size 
     * @param {Number} max_size 
     * @returns {PcSet[]}
     */
    getPrimeSubsets(min_size = 0, max_size = this.size) {
        let sets = [];
        const arrays = PcSet.#combinations(this.#data);
        for ( const array of arrays )
            if ( array.length >= min_size && array.length <= max_size )
                sets.push(new PcSet(array).prime);
        PcSet.#filterUnique(sets, false);
        sets.sort((a,b) => a.size - b.size);
        return sets;
    }

    /** 
     * @returns {{i: Number[], p: Number[], ri: Number[], r: Number[]}}
     */
    getHexachordalCombinations() {
        if ( this.size != 6 ) return { i: [], p: [], ri: [], r: [] };
        const comb = {};
        const complement = this.complement.normal;
        const inversions = this.getInversionsUnique();
        const transpositions = this.getTranspositionsUnique(false);
        comb.i  = inversions.filter( (item) => item[1].isSameSetClass(complement) ).map( (item) => item[0] );
        comb.p  = transpositions.filter( (item) => item[1].isSameSetClass(complement) ).map( (item) => item[0] );
        comb.ri = inversions.filter( (item) => item[1].isSameSetClass(this) ).map( (item) => item[0] );
        comb.r  = transpositions.filter( (item) => item[1].isSameSetClass(this) ).map( (item) => item[0] );
        return comb;
    }


    /**
     * Returns all possible combinations of elements from an array as subarrays.
     * @param {any[]} array 
     * @returns {any[][]}
     */
    static #combinations(array = []) {
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

}


/**
 * Class for defining interval-class vectors.
 * 
 * To create an empty vector (all zeros), use IntervalClassVector().
 * 
 * To create a vector from an existing PC set, use:
 * 
 *      IntervalClassVector.from_pcset(set_object);
 * 
 * or:
 * 
 *      set_object.icvector;
 * 
 */
class IntervalClassVector {

    /** @type {[Number]} */
    data = Array(6).fill(0);

    get size() {
        return 6;
    }

    constructor(array) {
        const count = Math.min(6, array.length);
        for ( let i = 0; i < count; i++ )
            if ( typeof(array[i]) == "number" )
                this.data[i] = Math.trunc(array[i]);
    }

    /**
     * Returns a new IntervalClassVector object based on an existing set. Note that the
     * IntervalClassVector object is not linked to the source set, so that changes in the
     * set do not reflect on the IntervalClassVector object.
     * @param {PcSet} pcset The set from which to compute the interval-class vector.
     * @return {IntervalClassVector} Returns a new IntervalClassVector object.
     */
    static from_pcset(pcset) {
        let icvec = Array(6).fill(0);
        const size = pcset.size;
        for ( let i = 0; i < size-1; i++ ) {
            for ( let j = i+1; j < size; j++ ) {
                icvec[computeIntervalClass(pcset.at(i), pcset.at(j))-1] += 1;
            }
        }
        return new IntervalClassVector(icvec);
    }

    [Symbol.iterator]() {
        let index = 0;
        return {
            next: () => {
                if ( index == this.size )
                    return { done: true };
                return { value: this.data[index++], done: false };
            },
        };
    };

    /** @returns {String} */
    str_hex(include_brackets = false) {
        const s = this.data.map((x) => x.toString(16)).join("").toUpperCase();
        return (include_brackets) ? this.#enclose_str(s) : s;
    }

    /** @returns {String} */
    str_numbers(include_brackets = false) {
        const s = this.data.map((x) => x.toString()).join(",").toUpperCase();
        return (include_brackets) ? this.#enclose_str(s) : s;
    }

    /** @returns {String} */
    get #left_bracket() {
        return ICVEC_DEFAULT_BRACKETS.charAt(0);
    }

    /** @returns {String} */
    get #right_bracket() {
        return ICVEC_DEFAULT_BRACKETS.charAt(1);
    }

    /** @returns {String} */
    #enclose_str(s) {
        return this.#left_bracket + s + this.#right_bracket;
    }

    /** @returns {IntervalClassVector} */
    copy() {
        return new IntervalClassVector(this.data);
    }

    /** @returns {Number} */
    at(interval) {
        const ic = intervalClassOf(interval);
        return ( ic == 0 ) ? 0 : this.data[ic-1];
    }

    /** @returns {Number} */
    count_value(value, double6 = false) {
        if ( !double6 ) 
            return this.data.filter((x)=>x==value).length;
        return this.data.slice(0,5).filter( (x) => x == value ).lenth 
            + ( 2*this.data[5] == value ) ? 1 : 0;
    }

    /** @returns {Number} */
    sum() {
        return this.data.reduce((sum, x) => sum + x, 0);
    }

}


class CommonToneVector {

    data = Array(12).fill(0);

    get size() {
        return 12;
    }

    constructor(array) {
        const count = Math.min(12, array.length);
        for ( let i = 0; i < count; i++ )
            if ( typeof(array[i]) == "number" )
                this.data[i] = Math.trunc(array[i]);
    }

    /** 
     * @param {PcSet} pcset
     * @returns {CommonToneVector} 
     */
    static from_pcset(pcset) {
        let ctvec = Array(12).fill(0);
        for ( const a of pcset )
            for ( const b of pcset )
                ctvec[mod12(a+b)] += 1;
        return new CommonToneVector(ctvec);
    }

    /** @returns {String} */
    str_hex(include_brackets = false) {
        let s = "";
        for ( let x of this.data )
            switch (x) {
                case 10: s += 'A'; break;
                case 11: s += 'B'; break;
                case 12: s += 'C'; break;
                case 13: s += 'D'; break;
                default: s += x.toString();
            }
        //const s = this.#data.map((x) => x.toString(16)).join('').toUpperCase();
        return (include_brackets) ? this.#enclose_str(s) : s;
    }

    /** @returns {String} */
    str_numbers(include_brackets = false) {
        const s = this.data.map((x) => x.toString()).join(',');
        return (include_brackets) ? this.#enclose_str(s) : s;
    }

    /** @returns {String} */
    get #left_bracket() {
        return CTVEC_DEFAULT_BRACKETS.charAt(0);
    }

    /** @returns {String} */
    get #right_bracket() {
        return CTVEC_DEFAULT_BRACKETS.charAt(1);
    }

    /** @returns {String} */
    #enclose_str(s) {
        return this.#left_bracket + s + this.#right_bracket;
    }

    /** @returns {CommonToneVector} */
    copy() {
        return new CommonToneVector(this.data);
    }

    /** @returns {Number} */
    at(pitch) {
        return this.data[mod12(pitch)];
    }

    /** @returns {Number} */
    count_value(value) {
        return this.data.filter( (x) => x == value ).length;
    }

    /** @returns {Number} */
    sum() {
        return this.data.reduce((sum, x) => sum + x, 0);
    }

}


class Axis {

    /** @type {Number} */ a;
    /** @type {Number} */ b;

    /**
     * @param {Number} a 
     * @param {Number} b 
     */
    constructor (a, b = null) {
        this.a = mod12(a);
        this.b = mod12( (b == null) ? a+6 : b );
    }

    static fromIndex(i) {
        return new Axis(i/2, i/2+6);
    }

    /** @returns {[Number, Number]} */
    get pair() {
        return [this.a, this.b];
    }

    /** @returns {String} */
    toString() {
        return `Axis(${this.a},${this.b})`;
    }

    /** @returns {Boolean} */
    equal_to(other) {
        return (this.a == other.a && this.b == other.b)
            || (this.a == other.b && this.b == other.a);
    }

}


/** 
 * Computes _val % div_ for positive values, and
 * _val % div + div_ for negative values.
 * @param {Number} val - value
 * @param {Number} div - divisor
 * @returns {Number} 
 */
function mod(val, div) {
    return (val >= 0) ? val%div : (val%div)+div;
}

/**
 * Shorthand for _mod(val, 12)_.
 * @param {Number} val
 * @returns {Number}
 */
function mod12(val) {
    return mod(val, 12);
}

/**
 * Shorthand for _mod(val, 6)_.
 * @param {Number} val
 * @returns {Number}
 */
function mod6(val) {
    return mod(val, 6);
}

/**
 * Computes the interval, in semitones, between two pitches.
 * @param {Number} low - lower pitch
 * @param {Number} high - higher pitch
 * @returns {Number}
 */
function computeInterval(low, high) {
    return mod12(high - low);
}

/**
 * Computes the interval class of an interval.
 * @param {Number} interval - Interval, in semitones.
 * @returns {Number} Interval class: 0, 1, 2, 3, 4, 5 or 6.
 */
function intervalClassOf(interval) {
    return (interval <= 6) ? interval : 12-interval;
}

/**
 * Computes the interval class given two pitches.
 * Same as: _intervalClassOf(computeInterval(pc1, pc2))_.
 * @param {Number} pc1 
 * @param {Number} pc2 
 * @returns {Number}
 */
function computeIntervalClass(pc1, pc2) {
    return intervalClassOf(computeInterval(pc1, pc2));
}

/** 
 * Returns _true_ if one of the strings in *sub_array* is found inside *str*.
 * @param {String} str
 * @param {String[]} sub_array
 * @returns {Boolean}
 */
function substrFoundInStr(str, sub_array) {
    for ( const sub of sub_array )
        if ( str.includes(sub) )
            return true;
    return false;
}

/**
 * Returns _true_ if a given pitch-class corresponds to a black-key.
 * @param {Number} pc 
 * @returns {Boolean}
 */
function isBlackKey(pc) {
    return [1,3,6,8,10].includes(pc);
}

/**
 * Returns _true_ if a given pitch-class corresponds to a white-key.
 * @param {Number} pc 
 * @returns {Boolean}
 */
function isWhiteKey(pc) {
    return [0,2,4,5,7,9,11].includes(pc);
}

/**
 * @typedef {Object} CatalogPcSetData
 * @property {String} fn  - Forte/Morris name.
 * @property {Number} cn  - Carte number.
 * @property {String} zc  - Z-correspondent set.
 * @property {String} inv - Inverse set (computed on script load).
 */

/**
 * Catalog of pitch-class sets. Usage:
 * 
 *      PCSET_CATALOG[cardinality][set].property
 * 
 * The set must be enclosed in brackets. Example:
 * 
 *      PCSET_CATALOG[3]["[012]"].fn
 * 
 * @type {Object.<String, CatalogPcSetData>[]}
 */
const PCSET_CATALOG = [
    { // index 0
        "[]": { fn: "0-1", cn: 1 },
    },
    { // index 1
        "[0]": { fn: "1-1", cn: 1 },
    },
    { // index 2
        "[01]": { fn: "2-1", cn: 1 },
        "[02]": { fn: "2-2", cn: 2 },
        "[03]": { fn: "2-3", cn: 3 },
        "[04]": { fn: "2-4", cn: 4 },
        "[05]": { fn: "2-5", cn: 5 },
        "[06]": { fn: "2-6", cn: 6 },
    },
    { // index 3
        "[012]": { fn: "3-1", cn: 4 },
        "[013]": { fn: "3-2", cn: 12 },
        "[014]": { fn: "3-3", cn: 11 },
        "[015]": { fn: "3-4", cn: 9 },
        "[016]": { fn: "3-5", cn: 7 },
        "[024]": { fn: "3-6", cn: 3 },
        "[025]": { fn: "3-7", cn: 10 },
        "[026]": { fn: "3-8", cn: 8 },
        "[027]": { fn: "3-9", cn: 5 },
        "[036]": { fn: "3-10", cn: 2 },
        "[037]": { fn: "3-11", cn: 6 },
        "[048]": { fn: "3-12", cn: 1 },
    },
    { // index 4
        "[0123]": { fn: "4-1", cn: 1 },
        "[0124]": { fn: "4-2", cn: 17 },
        "[0134]": { fn: "4-3", cn: 9 },
        "[0125]": { fn: "4-4", cn: 20 },
        "[0126]": { fn: "4-5", cn: 22 },
        "[0127]": { fn: "4-6", cn: 6 },
        "[0145]": { fn: "4-7", cn: 8 },
        "[0156]": { fn: "4-8", cn: 10 },
        "[0167]": { fn: "4-9", cn: 2 },
        "[0235]": { fn: "4-10", cn: 3 },
        "[0135]": { fn: "4-11", cn: 26 },
        "[0236]": { fn: "4-12", cn: 28 },
        "[0136]": { fn: "4-13", cn: 7 },
        "[0237]": { fn: "4-14", cn: 25 },
        "[0146]": { fn: "4-Z15", cn: 18, zc: "[0137]" },
        "[0157]": { fn: "4-16", cn: 19 },
        "[0347]": { fn: "4-17", cn: 13 },
        "[0147]": { fn: "4-18", cn: 21 },
        "[0148]": { fn: "4-19", cn: 24 },
        "[0158]": { fn: "4-20", cn: 15 },
        "[0246]": { fn: "4-21", cn: 11 },
        "[0247]": { fn: "4-22", cn: 27 },
        "[0257]": { fn: "4-23", cn: 4 },
        "[0248]": { fn: "4-24", cn: 16 },
        "[0268]": { fn: "4-25", cn: 12 },
        "[0358]": { fn: "4-26", cn: 14 },
        "[0258]": { fn: "4-27", cn: 29 },
        "[0369]": { fn: "4-28", cn: 5 },
        "[0137]": { fn: "4-Z29", cn: 23, zc: "[0146]" },
    },
    { // index 5
        "[01234]": { fn: "5-1", cn: 1 },
        "[01235]": { fn: "5-2", cn: 11 },
        "[01245]": { fn: "5-3", cn: 14 },
        "[01236]": { fn: "5-4", cn: 12 },
        "[01237]": { fn: "5-5", cn: 13 },
        "[01256]": { fn: "5-6", cn: 27 },
        "[01267]": { fn: "5-7", cn: 30 },
        "[02346]": { fn: "5-8", cn: 2 },
        "[01246]": { fn: "5-9", cn: 15 },
        "[01346]": { fn: "5-10", cn: 19 },
        "[02347]": { fn: "5-11", cn: 18 },
        "[01356]": { fn: "5-Z12", cn: 5, zc: "[01247]" },
        "[01248]": { fn: "5-13", cn: 17 },
        "[01257]": { fn: "5-14", cn: 28 },
        "[01268]": { fn: "5-15", cn: 4 },
        "[01347]": { fn: "5-16", cn: 20 },
        "[01348]": { fn: "5-Z17", cn: 10, zc: "[03458]" },
        "[01457]": { fn: "5-Z18", cn: 35, zc: "[01258]" },
        "[01367]": { fn: "5-19", cn: 31 },
        "[01568]": { fn: "5-20", cn: 34, fp: "[01378]" },
        "[01458]": { fn: "5-21", cn: 21 },
        "[01478]": { fn: "5-22", cn: 8 },
        "[02357]": { fn: "5-23", cn: 25 },
        "[01357]": { fn: "5-24", cn: 22 },
        "[02358]": { fn: "5-25", cn: 24 },
        "[02458]": { fn: "5-26", cn: 26 },
        "[01358]": { fn: "5-27", cn: 23 },
        "[02368]": { fn: "5-28", cn: 36 },
        "[01368]": { fn: "5-29", cn: 32 },
        "[01468]": { fn: "5-30", cn: 37 },
        "[01369]": { fn: "5-31", cn: 33 },
        "[01469]": { fn: "5-32", cn: 38 },
        "[02468]": { fn: "5-33", cn: 6 },
        "[02469]": { fn: "5-34", cn: 9 },
        "[02479]": { fn: "5-35", cn: 7 },
        "[01247]": { fn: "5-Z36", cn: 16, zc: "[01356]" },
        "[03458]": { fn: "5-Z37", cn: 3, zc: "[01348]" },
        "[01258]": { fn: "5-Z38", cn: 29, zc: "[01457]" },
    },
    { // index 6
        "[012345]": { fn: "6-1", cn: 4 },
        "[012346]": { fn: "6-2", cn: 19 },
        "[012356]": { fn: "6-Z3", cn: 49, zc: "[012347]" },
        "[012456]": { fn: "6-Z4", cn: 24, zc: "[012348]" },
        "[012367]": { fn: "6-5", cn: 16 },
        "[012567]": { fn: "6-Z6", cn: 33, zc: "[012378]" },
        "[012678]": { fn: "6-7", cn: 7 },
        "[023457]": { fn: "6-8", cn: 5 },
        "[012357]": { fn: "6-9", cn: 20 },
        "[013457]": { fn: "6-Z10", cn: 42, zc: "[023458]" },
        "[012457]": { fn: "6-Z11", cn: 47, zc: "[012358]" },
        "[012467]": { fn: "6-Z12", cn: 46, zc: "[012368]" },
        "[013467]": { fn: "6-Z13", cn: 29, zc: "[012369]" },
        "[013458]": { fn: "6-14", cn: 3 },
        "[012458]": { fn: "6-15", cn: 13 },
        "[014568]": { fn: "6-16", cn: 11 },
        "[012478]": { fn: "6-Z17", cn: 35, zc: "[012568]" },
        "[012578]": { fn: "6-18", cn: 17 },
        "[013478]": { fn: "6-Z19", cn: 37, zc: "[012569]" },
        "[014589]": { fn: "6-20", cn: 2 },
        "[023468]": { fn: "6-21", cn: 12 },
        "[012468]": { fn: "6-22", cn: 10 },
        "[023568]": { fn: "6-Z23", cn: 27, zc: "[023469]" },
        "[013468]": { fn: "6-Z24", cn: 39, zc: "[012469]" },
        "[013568]": { fn: "6-Z25", cn: 43, zc: "[012479]" },
        "[013578]": { fn: "6-Z26", cn: 26, zc: "[012579]" },
        "[013469]": { fn: "6-27", cn: 14 },
        "[013569]": { fn: "6-Z28", cn: 21, zc: "[013479]" },
        "[023679]": { fn: "6-Z29", cn: 32, zc: "[014679]", fp: "[013689]" },
        "[013679]": { fn: "6-30", cn: 15 },
        "[014579]": { fn: "6-31", cn: 8, fp: "[013589]" },
        "[024579]": { fn: "6-32", cn: 6 },
        "[023579]": { fn: "6-33", cn: 18 },
        "[013579]": { fn: "6-34", cn: 9 },
        "[02468A]": { fn: "6-35", cn: 1 },
        "[012347]": { fn: "6-Z36", cn: 50, zc: "[012356]" },
        "[012348]": { fn: "6-Z37", cn: 23, zc: "[012456]" },
        "[012378]": { fn: "6-Z38", cn: 34, zc: "[012567]" },
        "[023458]": { fn: "6-Z39", cn: 41, zc: "[013457]" },
        "[012358]": { fn: "6-Z40", cn: 48, zc: "[012457]" },
        "[012368]": { fn: "6-Z41", cn: 45, zc: "[012467]" },
        "[012369]": { fn: "6-Z42", cn: 30, zc: "[013467]" },
        "[012568]": { fn: "6-Z43", cn: 36, zc: "[012478]" },
        "[012569]": { fn: "6-Z44", cn: 38, zc: "[013478]" },
        "[023469]": { fn: "6-Z45", cn: 28, zc: "[023568]" },
        "[012469]": { fn: "6-Z46", cn: 40, zc: "[013468]" },
        "[012479]": { fn: "6-Z47", cn: 44, zc: "[013568]" },
        "[012579]": { fn: "6-Z48", cn: 25, zc: "[013578]" },
        "[013479]": { fn: "6-Z49", cn: 22, zc: "[013569]" },
        "[014679]": { fn: "6-Z50", cn: 31, zc: "[023679]" },
    },
    { // index 7
        "[0123456]": { fn: "7-1", cn: 1 },
        "[0123457]": { fn: "7-2", cn: 11 },
        "[0123458]": { fn: "7-3", cn: 14 },
        "[0123467]": { fn: "7-4", cn: 12 },
        "[0123567]": { fn: "7-5", cn: 13 },
        "[0123478]": { fn: "7-6", cn: 27 },
        "[0123678]": { fn: "7-7", cn: 30 },
        "[0234568]": { fn: "7-8", cn: 2 },
        "[0123468]": { fn: "7-9", cn: 15 },
        "[0123469]": { fn: "7-10", cn: 19 },
        "[0134568]": { fn: "7-11", cn: 18 },
        "[0123479]": { fn: "7-Z12", cn: 5, zc: "[0123568]" },
        "[0124568]": { fn: "7-13", cn: 17 },
        "[0123578]": { fn: "7-14", cn: 28 },
        "[0124678]": { fn: "7-15", cn: 4 },
        "[0123569]": { fn: "7-16", cn: 20 },
        "[0124569]": { fn: "7-Z17", cn: 10, zc: "[0134578]" },
        "[0145679]": { fn: "7-Z18", cn: 35, zc: "[0124578]", fp: "[0123589]" },
        "[0123679]": { fn: "7-19", cn: 31 },
        "[0125679]": { fn: "7-20", cn: 34 , fp: "[0124789]" },
        "[0124589]": { fn: "7-21", cn: 21 },
        "[0125689]": { fn: "7-22", cn: 8 },
        "[0234579]": { fn: "7-23", cn: 25 },
        "[0123579]": { fn: "7-24", cn: 22 },
        "[0234679]": { fn: "7-25", cn: 24 },
        "[0134579]": { fn: "7-26", cn: 26 },
        "[0124579]": { fn: "7-27", cn: 23 },
        "[0135679]": { fn: "7-28", cn: 36 },
        "[0124679]": { fn: "7-29", cn: 32 },
        "[0124689]": { fn: "7-30", cn: 37 },
        "[0134679]": { fn: "7-31", cn: 33 },
        "[0134689]": { fn: "7-32", cn: 38 },
        "[012468A]": { fn: "7-33", cn: 6 },
        "[013468A]": { fn: "7-34", cn: 9 },
        "[013568A]": { fn: "7-35", cn: 7 },
        "[0123568]": { fn: "7-Z36", cn: 16, zc: "[0123479]" },
        "[0134578]": { fn: "7-Z37", cn: 3, zc: "[0124569]" },
        "[0124578]": { fn: "7-Z38", cn: 29, zc: "[0145679]" },
    },
    { // index 8
        "[01234567]": { fn: "8-1", cn: 1 },
        "[01234568]": { fn: "8-2", cn: 17 },
        "[01234569]": { fn: "8-3", cn: 9 },
        "[01234578]": { fn: "8-4", cn: 20 },
        "[01234678]": { fn: "8-5", cn: 22 },
        "[01235678]": { fn: "8-6", cn: 6 },
        "[01234589]": { fn: "8-7", cn: 8 },
        "[01234789]": { fn: "8-8", cn: 10 },
        "[01236789]": { fn: "8-9", cn: 2 },
        "[02345679]": { fn: "8-10", cn: 3 },
        "[01234579]": { fn: "8-11", cn: 26 },
        "[01345679]": { fn: "8-12", cn: 28 },
        "[01234679]": { fn: "8-13", cn: 7 },
        "[01245679]": { fn: "8-14", cn: 25 },
        "[01234689]": { fn: "8-Z15", cn: 18, zc: "[01235679]" },
        "[01235789]": { fn: "8-16", cn: 19 },
        "[01345689]": { fn: "8-17", cn: 13 },
        "[01235689]": { fn: "8-18", cn: 21 },
        "[01245689]": { fn: "8-19", cn: 24 },
        "[01245789]": { fn: "8-20", cn: 15 },
        "[0123468A]": { fn: "8-21", cn: 11 },
        "[0123568A]": { fn: "8-22", cn: 27 },
        "[0123578A]": { fn: "8-23", cn: 4 },
        "[0124568A]": { fn: "8-24", cn: 16 },
        "[0124678A]": { fn: "8-25", cn: 12 },
        "[0134578A]": { fn: "8-26", cn: 14, fp: "[0124579A]" },
        "[0124578A]": { fn: "8-27", cn: 29 },
        "[0134679A]": { fn: "8-28", cn: 5 },
        "[01235679]": { fn: "8-Z29", cn: 23, zc: "[01234689]" },
    },
    { // index 9
        "[012345678]": { fn: "9-1", cn: 4 },
        "[012345679]": { fn: "9-2", cn: 12 },
        "[012345689]": { fn: "9-3", cn: 11 },
        "[012345789]": { fn: "9-4", cn: 9 },
        "[012346789]": { fn: "9-5", cn: 7 },
        "[01234568A]": { fn: "9-6", cn: 3 },
        "[01234578A]": { fn: "9-7", cn: 10 },
        "[01234678A]": { fn: "9-8", cn: 8 },
        "[01235678A]": { fn: "9-9", cn: 5 },
        "[01234679A]": { fn: "9-10", cn: 2 },
        "[01235679A]": { fn: "9-11", cn: 6 },
        "[01245689A]": { fn: "9-12", cn: 1 },
    },
    { // index 10
        "[0123456789]": { fn: "10-1", cn: 1 },
        "[012345678A]": { fn: "10-2", cn: 2 },
        "[012345679A]": { fn: "10-3", cn: 3 },
        "[012345689A]": { fn: "10-4", cn: 4 },
        "[012345789A]": { fn: "10-5", cn: 5 },
        "[012346789A]": { fn: "10-6", cn: 6 },
    },
    { // index 11
        "[0123456789A]": { fn: "11-1", cn: 1 },
    },
    { // index 12
        "[0123456789AB]": { fn: "12-1", cn: 1 }
    }
]

// Add inverses to catalog
for ( let i = 3; i < 11; i++ ) {
    for ( const entry of Object.entries(PCSET_CATALOG[i]) ) {
        const prime = new PcSet(entry[0]);
        const inverse = prime.invert().reduced;
        if ( !prime.isEqualTo(inverse) )
            entry[1].inv = inverse.toString("short-ab", true);
    }
}
