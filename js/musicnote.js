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

class MusicalScale {

    #notes = [];

    constructor(notes) { this.#notes = notes; }
    
    static fromPcset(pcset) {
        const notes = pcset.to_array().map((x) =>
            new MusicalNote( (x >= pcset.head) ? x : x+12 ));
        return new MusicalScale(notes);
    }

    [Symbol.iterator]() {
        let index = 0;
        return {
            next: () => {
                if ( index == this.#notes.length )
                    return { done: true };
                return { value: this.#notes[index++], done: false };
            },
        }
    }

    get size() { return this.#notes.length; }
    note(index) { return this.#notes[index]; }
    get notes() { return this.#notes; }
    clone() { return new MusicalScale(this.#notes); }

    adjustToClef(clef_str) {
        const staff_center = ( clef_str == "G2" ) ? 5.5 : 6;
        function computeMean(notes) {
            return (notes[0].staffPosition(clef_str) + notes[notes.length-1].staffPosition(clef_str)) / 2;
        }
        let mean = Math.abs(staff_center - computeMean(this.#notes));
        let min = mean;
        this.#notes.forEach( (note) => note.unlock() );
        while ( mean <= min ) {
            min = mean;
            this.#notes.forEach( (note) => note.transposeOctaves(1) );
            mean = Math.abs(staff_center - computeMean(this.#notes));
        }
        this.#notes.forEach( (note) => note.transposeOctaves(-1) );
    }

    makeOnlySharps() {
        this.#notes.forEach( (note) => { note.accidental = ( note.isWhiteKey() ) ? 0 : 1 } );
    }

    makeOnlyFlats() {
        this.#notes.forEach( (note) => { note.accidental = ( note.isWhiteKey() ) ? 0 : -1 } );
    }

    makeIdealDistribution() {
        const size = this.size;

        if ( size > 0 ) {

            // Compute best note distribution.
            // The algorithms here are a real mess... but they work.

            const BCEF = [0,4,5,11];
            const last = size-1;

            function makeIntervalGood(note, other) {
                const interval = new Interval(note, other);
                if ( ! ['P','M','m'].includes(interval.quality) )
                    note.swapAccidental();
                if ( size < 7 && ! ['P','M','m'].includes(interval.quality) )
                    other.swapAccidental();
            }

            function makeIntervalGoodExceptBCEF(note, other, try_other = false) {
                const interval = new Interval(note, other);
                if ( !BCEF.includes(note.class) || note.isAltered() )
                    if ( ! ['P','M','m'].includes(interval.quality) )
                        note.swapAccidental();
                if ( try_other )
                    if ( !BCEF.includes(other.class) || other.isAltered() )
                        if ( ! ['P','M','m'].includes(interval.quality) )
                            other.swapAccidental();
            }

            function makeNotesDifferent(note, other) {
                if ( note.diatonic_class == other.diatonic_class )
                    note.swapAccidental();
            }

            function makeNoteBeAbove(note, other) {
                if ( note.pitch > other.pitch && note.diatonic_index < other.diatonic_index )
                    note.swapAccidental();
            }

            function getBestNotesVersion(v1, v2) {
                // Avoid repeated notes
                let same_note_count1 = pairwise(v1, true).filter(
                    (pair) => ( pair[1].diatonic_class == pair[0].diatonic_class )
                ).length;
                let same_note_count2 = pairwise(v2, true).filter(
                    (pair) => ( pair[1].diatonic_class == pair[0].diatonic_class )
                ).length;
                // Avoid augmented and diminished intervals
                let aug_dim_count1 = pairwise(v1).filter(
                    (pair) => ( ! new Interval(pair[0], pair[1]).isPMm() )
                ).length;
                let aug_dim_count2 = pairwise(v2).filter(
                    (pair) => ( ! new Interval(pair[0], pair[1]).isPMm() )
                ).length;
                // Avoid unnecessary accidentals
                const acc_count1 = v1.filter( (note) => note.isAltered() ).length;
                const acc_count2 = v2.filter( (note) => note.isAltered() ).length;
                // Avoid explicit naturals
                const nat_count1 = pairwise(v1).filter(
                    (pair) => pair[0].diatonic_index == pair[1].diatonic_index
                        && pair[0].isAltered() && pair[1].isNatural()
                ).length;
                const nat_count2 = pairwise(v2).filter(
                    (pair) => pair[0].diatonic_index == pair[1].diatonic_index
                        && pair[0].isAltered() && pair[1].isNatural()
                ).length;
                // Avoid altered BCEF
                let alt_bcef_count1 = v1.filter(
                    (note) => BCEF.includes(note.class) && note.isAltered()
                ).length;
                let alt_bcef_count2 = v2.filter(
                    (note) => BCEF.includes(note.class) && note.isAltered()
                ).length;

                // Change weights in some cases
                if ( size < 8 ) {
                    same_note_count1 *= 6;
                    same_note_count2 *= 6;
                }
                if ( size < 7 ) {
                    aug_dim_count1 *= 3;
                    aug_dim_count2 *= 3;
                    if ( size > 4 ) {
                        alt_bcef_count1 *= 3;
                        alt_bcef_count2 *= 3;
                    }
                }

                const total1 = same_note_count1 + aug_dim_count1 + acc_count1 + nat_count1 + alt_bcef_count1;
                const total2 = same_note_count2 + aug_dim_count2 + acc_count2 + nat_count2 + alt_bcef_count2;
                return ( total1 <= total2 ) ? v1 : v2;
            }

            const hasTwoConsecutiveSemitones = pairwise(pairwise(this.#notes)).some(
                (pair) => new Interval(pair[0][0], pair[0][1]).semitones == 1
                       && new Interval(pair[1][0], pair[1][1]).semitones == 1
            );

            if ( !hasTwoConsecutiveSemitones && size < 8 ) {

                const notesv1 = cloneMusicalNoteArray(this.#notes);
                for ( const pair of pairwise(notesv1) )
                    makeIntervalGood(pair[1], pair[0]);
                makeNotesDifferent(notesv1[last], notesv1[0]);
                notesv1[last].lock();
                for ( const pair of pairwise(notesv1).reverse() ) {
                    makeNotesDifferent(pair[1], pair[0]);
                    makeNoteBeAbove(pair[1], pair[0]);
                }
                makeNotesDifferent(notesv1[last], notesv1[0]);

                const notesv2 = cloneMusicalNoteArray(notesv1);
                notesv2.forEach( (note) => note.swapAccidental() );
                for ( const pair of pairwise(notesv2) )
                    makeIntervalGood(pair[1], pair[0]);
                makeNotesDifferent(notesv2[0], notesv2[last]);
                for ( const pair of pairwise(notesv2.slice(1)).reverse() ) {
                    makeNotesDifferent(pair[1], pair[0]);
                    makeNoteBeAbove(pair[1], pair[0]);
                }
                makeNotesDifferent(notesv2[last], notesv2[0]);

                const notesv3 = cloneMusicalNoteArray(this.#notes);
                for ( const pair of pairwise(notesv3) )
                    makeIntervalGoodExceptBCEF(pair[1], pair[0], true);
                makeNotesDifferent(notesv3[last], notesv3[0]);
                notesv3[last].lock();
                for ( const pair of pairwise(notesv3).reverse() ) {
                    makeIntervalGoodExceptBCEF(pair[0], pair[1]);
                    makeNotesDifferent(pair[1], pair[0]);
                    makeNoteBeAbove(pair[1], pair[0]);
                }
                makeNotesDifferent(notesv3[last], notesv3[0]);

                this.#notes = getBestNotesVersion(notesv1, notesv2);
                this.#notes = getBestNotesVersion(this.#notes, notesv3);;

            } else {

                // Algorithm : try to avoid aug/dim intervals while
                // keeping BCEF intact.
                if ( BCEF.includes(this.#notes[0].class) ) this.#notes[0].lock();
                for ( const pair of pairwise(this.#notes) )
                    makeIntervalGoodExceptBCEF(pair[1], pair[0]);
                for ( const pair of pairwise(this.#notes).reverse() )
                    makeIntervalGoodExceptBCEF(pair[0], pair[1]);

            }

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
