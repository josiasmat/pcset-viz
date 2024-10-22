/*
Musical Note Javascript library
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


const WHITE_PCS = [0,2,4,5,7,9,11];
const BLACK_PCS = [1,3,6,8,10];


class MusicalNote {

    #pitch = 0;
    #accidental = 0;
    #lock = false;

    constructor(pitch, accidental = null) {
        if ( accidental == null )
            this.pitch = pitch;
        else {
            this.#pitch = pitch;
            this.#accidental = accidental;
        }
    }
    get pitch() { return this.#pitch; }
    set pitch(pitch) { 
        if ( this.#lock ) return;
        const pc = MusicalNote.#class(pitch);
        if ( pc != this.class ) {
            if ( WHITE_PCS.includes(pc) )
                this.#accidental = 0;
            else if ( pitch > this.#pitch )
                this.#accidental = 1;
            else
                this.#accidental = -1;
        }
        this.#pitch = pitch;
    }
    clone() {
        return new MusicalNote(this.#pitch, this.#accidental);
    }
    static #class(pitch) { return pitch % 12; }
    get class() { return MusicalNote.#class(this.#pitch); };
    set class(pc) { this.pitch = pc + (12*this.octave); }
    get accidental() { return this.#accidental; }
    static #octave(pitch) { return Math.floor(pitch / 12); }
    get octave() { return MusicalNote.#octave(this.#pitch); }
    set octave(oct) { this.transposeOctaves(oct - this.octave); }
    toString() {
        return ['C','D','E','F','G','A','B'][this.diatonic_index%7] + ['♭♭','♭','','♯','♯♯'][this.#accidental+2];
    }
    get locked() {
        return this.#lock;
    }
    lock() {
        this.#lock = true;
    }
    unlock() {
        this.#lock = false;
    }
    static #diatonicIndex(pitch, accidental = 0) {
        const pc = MusicalNote.#class(pitch);
        const octave_offset = 7 * MusicalNote.#octave(pitch);
        switch ( accidental ) {
            case 1:
                return [-1,0,1,1,2,2,3,4,4,5,5,6][pc] + octave_offset;
            case -1:
                return [0,1,1,2,3,3,4,4,5,5,6,7][pc] + octave_offset;
            default:
                return [0,0,1,1,2,3,3,4,4,5,5,6][pc] + octave_offset;
        }
    }
    get diatonic_index() {
        return MusicalNote.#diatonicIndex(this.#pitch, this.#accidental);
    }
    get diatonic_class() {
        return this.diatonic_index % 7;
    }
    transpose(semitones) { 
        if ( this.#lock ) return;
        this.pitch += semitones; 
    }
    transposeOctaves(octaves) { 
        if ( this.#lock ) return;
        this.#pitch += 12*octaves; 
    }
    isNatural() { return this.isWhiteKey() && this.#accidental == 0; }
    isAltered() { return this.#accidental != 0; }
    isWhiteKey() { return WHITE_PCS.includes(this.class); }
    isBlackKey() { return BLACK_PCS.includes(this.class); }
    makeNatural() {
        if ( this.#lock ) return;
        if ( this.isWhiteKey() )
            this.#accidental = 0;
        else
            this.transpose(-this.#accidental);
    }
    swapAccidental() {
        if ( this.#lock ) return;
        const pc = this.class;
        if ( [2,7,9].includes(pc) )
            this.#accidental = 0;
        else if ( this.#accidental == 0 )
            this.#accidental = [1,0,0,0,-1,1,0,0,0,0,0,-1][pc];
        else if ( [0,4,5,11].includes(pc) )
            this.#accidental = 0;
        else
            this.#accidental *= -1;
    }
    staffPosition(clef = "G2") {
        clef = clef.toUpperCase();
        if ( clef == "G" ) clef = "G2";
        if ( clef == "F" ) clef = "F4";
        if ( clef == "C" ) clef = "C3";
        const clef_line = parseInt(clef[1]);
        let clef_index;
        switch ( clef[0] ) {
            case "G": clef_index = MusicalNote.#diatonicIndex(67); break;
            case "F": clef_index = MusicalNote.#diatonicIndex(53); break;
            case "C": clef_index = MusicalNote.#diatonicIndex(60);
        }
        const delta = this.diatonic_index - clef_index;
        return (clef_line*2) + delta;
    }
}

class Interval {
    
    #note1;
    #note2;
    #semitones;
    #size;
    #reduced;

    /**
     * Creates a new DiatonicInterval object linked to two MusicalNote objects.
     * @param {MusicalNote} note1 
     * @param {MusicalNote} note2 
     * @returns {Interval}
     */
    constructor(note1, note2, reduce = false) {
        this.#note1 = note1;
        this.#note2 = note2;
        this.#reduced = reduce;
    }

    #computeSize() {
        const top = this.top_note;
        const low = this.low_note;
        this.#semitones = top.pitch - low.pitch;
        this.#size = top.diatonic_index - low.diatonic_index + 1;
        if ( this.#reduced ) this.#reduce();
    }

    get semitones() {
        this.#computeSize();
        return this.#semitones;
    }

    get size() {
        this.#computeSize();
        return this.#size;
    }

    get quality() {
        this.#computeSize();
        let rst = this.#semitones;
        let rsz = this.#size;
        while ( rsz > 8 && rst > 11 ) {
            rsz -= 7;
            rst -= 12;
        }
        return ( [1,4,5,8].includes(rsz) )
            ? ['SD','D','P','A','SA'][[rst+2,,,rst-3,rst-5,,,rst-10][rsz-1]]
            : ['SD','D','m','M','A','SA'][[,rst+1,rst-1,,,rst-6,rst-8][rsz-1]];
    }

    get top_note() {
        return ( this.#note2.pitch > this.#note1.pitch ) ? this.#note2 : this.#note1;
    }

    get low_note() {
        return ( this.#note1.pitch <= this.#note2.pitch ) ? this.#note1 : this.#note2;
    }

    isPMm() {
        return ['P','M','m'].includes(this.quality);
    }

    toString() {
        const q = this.quality; // this computes size
        const s = this.#size;
        return `${q}${s}`;
    }

    #reduce() {
        while ( this.#size > 8 && this.#semitones > 11 ) {
            this.#size -= 7;
            this.#semitones -= 12;
        }
    }

}

/**
 * Clones an array of MusicalNote objects.
 * @param {MusicalNote[]} source 
 * @returns {MusicalNote[]}
 */
function cloneMusicalNoteArray(source) {
    return source.map( (note) => note.clone() );
}
