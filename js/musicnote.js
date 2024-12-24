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


/** A musical note, with pitch and accidental indication. */
class MusicalNote {

    /** @type {Number} */  #pitch;
    /** @type {Number} */  #accidental;
    /** @type {Boolean} */ #lock = false;

    /**
     * @param {Number} pitch 
     * @param {Number} accidental 
     * @returns {MusicalNote}
     */
    constructor(pitch, accidental = null) {
        if ( accidental === null )
            this.pitch = pitch;
        else {
            this.#pitch = pitch;
            this.#accidental = accidental;
        }
    }

    /** The pitch, counting from C0 as zero. @returns {Number} */
    get pitch() { return this.#pitch; }

    /** @param {Number} pitch */
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

    /** Returns a deep-copy of this MusicalNote object. @returns {MusicalNote} */
    clone() {
        return (new MusicalNote(this.#pitch, this.#accidental));
    }

    /** @returns {Number} */
    static #class(pitch) { return pitch % 12; }

    /** Note's pitch-class number (C = 0). @returns {Number} */
    get class() { return MusicalNote.#class(this.#pitch); };
    set class(pc) { this.pitch = pc + (12*this.octave); }

    /** @returns {Number} */
    get accidental() { return this.#accidental; }

    /** @param {Number} pitch @returns {Number} */
    static #octave(pitch) { return Math.floor(pitch / 12); }

    /** Note's octave number, counting from C0. @returns {Number} */
    get octave() { return MusicalNote.#octave(this.#pitch); }
    set octave(oct) { this.transposeOctaves(oct - this.octave); }

    /** @returns {String} */
    toString() {
        const letter = ['C','D','E','F','G','A','B'][this.diatonic_class];
        const accidental = ['♭♭','♭','','♯','♯♯'][this.#accidental+2];
        return `${letter}${accidental}${this.octave}`
    }

    /** 
     * Set _locked_ to _true_ to prevent changes to the note.
     * You can also use methods _lock()_ and _unlock()_.
     * @returns {Boolean} 
     */
    get locked() { return this.#lock; }
    set locked(value) { this.#lock = value; }

    /** Locks a note so that it cannot be changed. */
    lock() { this.#lock = true; }

    /** Unlocks a note if it was locked before. */
    unlock() { this.#lock = false; }

    /**
     * @param {Number} pitch 
     * @param {Number} accidental 
     * @returns {Number} The diatonic index, starting from C0 as zero.
     */
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

    /** The diatonic index, starting from C0 as zero. @returns {Number} */
    get diatonic_index() {
        return MusicalNote.#diatonicIndex(this.#pitch, this.#accidental);
    }

    /** The diatonic class, counting from C (as 0) to B (as 7). @returns {Number} */
    get diatonic_class() {
        return this.diatonic_index % 7;
    }

    /** 
     * Transposes a note by a given amount of semitones.
     * @param {Number} semitones Positive values transpose up; 
     *      negative ones transpose down.
     * */
    transpose(semitones) { 
        if ( this.#lock ) return;
        this.pitch += semitones; 
    }

    /**
     * Transposes a note by a given amount of octaves.
     * @param {Number} octaves Positive values transpose up;
     *      negative ones transpose down.
     */
    transposeOctaves(octaves) { 
        if ( this.#lock ) return;
        this.#pitch += 12*octaves; 
    }

    /** @returns {Boolean} True if the note has no alteration. */
    isNatural() { return this.isWhiteKey() && this.#accidental == 0; }

    /** @returns {Boolean} True if the note has an alteration. */
    isAltered() { return this.#accidental != 0; }

    /** @returns {Boolean} True if the note is on a white key. */
    isWhiteKey() { return WHITE_PCS.includes(this.class); }

    /** @returns {Boolean} True if the note is on a black key. */
    isBlackKey() { return BLACK_PCS.includes(this.class); }

    /** Removes any accidental from the note, making it natural. */
    makeNatural() {
        if ( this.#lock ) return;
        if ( this.isWhiteKey() )
            this.#accidental = 0;
        else
            this.transpose(-this.#accidental);
    }

    /** Changes the note to its enharmonic equivalent. */
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

    /**
     * Returns the position of the note on the staff according to given clef.
     * @param {String} clef A clef string. Common ones: "G2", "F4", "C3", "C4".
     *      Any combination of note letter and line number is allowed.
     * @returns {Number} The position of the note on the staff, counting bottom
     *      to top from the position just under the first line as zero.
     */
    staffPosition(clef = "G2") {
        clef = clef.toUpperCase();
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

/** An interval between two MusicalNote objects. */
class MusicalInterval {
    
    /** @type {MusicalNote} */ #note1;
    /** @type {MusicalNote} */ #note2;

    /**
     * Creates a new DiatonicInterval object linked to two MusicalNote objects.
     * @param {MusicalNote} note1 
     * @param {MusicalNote} note2 
     * @returns {MusicalInterval}
     */
    constructor(note1, note2) {
        this.#note1 = note1;
        this.#note2 = note2;
    }

    /** @returns {[Number,Number]} [semitones, diatonic_size] */
    #computeSizes() {
        const top = this.top_note;
        const low = this.low_note;
        const semitones = top.pitch - low.pitch;
        const dia_size = top.diatonic_index - low.diatonic_index + 1;
        return [semitones, dia_size];
    }

    /**
     * @param {[Number,Number]} sizes - [semitones, diatonic_size]
     * @returns {String}
     */
    #computeQuality(sizes) {
        let [rst, rsz] = sizes;
        while ( rsz > 8 && rst > 11 ) {
            rsz -= 7;
            rst -= 12;
        }
        return ( [1,4,5,8].includes(rsz) )
            ? ['sd','d','P','A','SA'][[rst+2,,,rst-3,rst-5,,,rst-10][rsz-1]]
            : ['sd','d','m','M','A','SA'][[,rst+1,rst-1,,,rst-6,rst-8][rsz-1]];
    }

    /** The size of the interval, in semitones. @returns {Number} */
    get semitones() {
        return this.#computeSizes()[0];
    }

    /** The reduced size of the interval, in semitones (0-11). @returns {Number} */
    get semitones_reduced() {
        return this.semitones % 12;
    }

    /** The interval's class (0-6). @returns {Number} */
    get class() {
        const sr = this.semitones_reduced;
        return (sr > 6) ? 12-sr : sr;
    }

    /** The diatonic size of the interval. @returns {Number} */
    get number() {
        return this.#computeSizes()[1];
    }

    /** The reduced diatonic size of the interval (1-8). @returns {Number} */
    get number_reduced() {
        let szr = this.number;
        while ( szr > 8 ) szr -= 7;
        return szr;
    }

    /** 
     * The quality of the interval: 
     *      "P" = perfect, "M" = major, "m" = minor,
     *      "A" = augmented, "SA" = super-augmented,
     *      "d" = diminished, "sd" = super-diminished.
     * @returns {String} 
     */
    get quality() {
        return this.#computeQuality(this.#computeSizes());
    }

    /** Interval's top/high note. @returns {MusicalNote} */
    get top_note() {
        return ( this.#note2.pitch > this.#note1.pitch ) ? this.#note2 : this.#note1;
    }

    /** Interval's low/bottom note. @returns {MusicalNote} */
    get low_note() {
        return ( this.#note1.pitch <= this.#note2.pitch ) ? this.#note1 : this.#note2;
    }

    /** @returns {Boolean} True if interval is perfect, major or minor. */
    isPMm() {
        return ['P','M','m'].includes(this.quality);
    }

    /** @returns {String} A string representation of the interval (e.g. "P5"). */
    toString() {
        const s = this.#computeSizes();
        const q = this.#computeQuality(s);
        return `${q}${s[1]}`;
    }

}

/** An ordered collection of MusicalNote objects. */
class MusicalScale {

    /** @type {MusicalNote[]} */
    #notes = [];

    descending = false;

    /** 
     * An ordered collection of MusicalNote objects.
     * @param {MusicalNote[]} notes 
     * @returns {MusicalScale}
     */
    constructor(notes, descending = false) { 
        this.#notes = notes; 
        this.descending = this.descending;
    }
    
    /**
     * Constructs a new MusicalScale object from a PcSet object.
     * @param {PcSet} pcset 
     * @returns {MusicalScale}
     */
    static fromPcset(pcset, descending = false) {
        const notes = descending
            ? pcset.toArray().reverse().map((x) =>
                new MusicalNote( (x >= pcset.head) ? x : x+12 ))
            : pcset.toArray().map((x) =>
                new MusicalNote( (x >= pcset.head) ? x : x+12 ));
        return new MusicalScale(notes, descending);
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

    /** The number of notes in the scale. @returns {Number} */
    get size() { return this.#notes.length; }

    /** 
     * @param {Number} index
     * @returns {MusicalNote} 
     */
    note(index) { return this.#notes[index]; }

    /** The array of MusicalNote objects. @return {MusicalNote[]} */
    get notes() { return this.#notes; }

    /** 
     * Returns a deep-copy of this MusicalScale object. 
     * @return {MusicalScale} 
     * */
    clone() { return new MusicalScale(this.#notes.map( (note) => note.clone() )); }

    get lowest() {
        return ( this.descending ) ? this.#notes.at(-1) : this.#notes[0];
    }

    get highest() {
        return ( this.descending ) ? this.#notes[0] : this.#notes.at(-1);
    }

    /**
     * Transpose notes so that they fit best to the staff with given clef.
     * @param {String} clef_str Common clefs: "G2", "F4", "C3", "C4". Any
     *      combination of note letter and line number is allowed.
     */
    adjustToClef(clef_str) {
        if ( this.size == 0 ) return;
        const locks = this.#notes.map( (note) => note.locked );
        this.#notes.forEach( (note) => note.unlock() );
        // Lowest note position must be equal or above -1
        while ( this.highest.staffPosition(clef_str) > 10 )
            this.#notes.forEach( (note) => note.transposeOctaves(-1) );
        while ( this.lowest.staffPosition(clef_str) < -1 )
            this.#notes.forEach( (note) => note.transposeOctaves(1) );
        // Get best position
        const staff_center = ( clef_str == "G2" ) ? 4.5 : 6;
        /** @param {MusicalNote[]} notes @returns {Number} */
        function computeScaleCenter(notes) {
            return ( notes[0].staffPosition(clef_str) + notes.at(-1).staffPosition(clef_str) ) / 2
        };
        const delta1 = Math.abs(staff_center - computeScaleCenter(this.#notes));
        const octave_up = this.clone().notes;
        octave_up.forEach( (note) => note.transposeOctaves(1) );
        const delta2 = Math.abs(staff_center - computeScaleCenter(octave_up));
        if ( delta2 < delta1 )
            this.#notes = octave_up;
        this.#notes.forEach( (note, i) => { if ( locks[i] ) note.lock(); } );
    }

    /** Make all black-key notes be sharps. */
    makeOnlySharps() {
        this.#notes.forEach( (note) => { note.accidental = ( note.isWhiteKey() ) ? 0 : 1 } );
    }

    /** Make all black-key notes be flats. */
    makeOnlyFlats() {
        this.#notes.forEach( (note) => { note.accidental = ( note.isWhiteKey() ) ? 0 : -1 } );
    }

    /** Lock all notes. */
    lockAllNotes() {
        this.#notes.forEach( (note) => note.lock() );
    }

    /** Unlock all notes. */
    unlockAllNotes() {
        this.#notes.forEach( (note) => note.unlock() );
    }

    /** @returns {String} */
    toString() {
        return this.#notes.map( (note) => note.toString() ).join();
    }

    /** 
     * Computes the ideal accidentals for the collection of notes, trying to avoid
     * augmented and diminished intervals, explicit naturals, repeated notes, etc.
     */
    makeIdealDistribution() {
        const size = this.size;
        const locked_notes = this.#notes.map( (note) => note.locked );

        if ( size > 0 ) {

            // Compute best note distribution.
            // The algorithms here are a real mess... but they work.

            const BCEF = [0,4,5,11];
            const last_index = size-1;

            /** @param {MusicalNote} note @param {MusicalNote} other */
            function makeIntervalGood(note, other) {
                const interval = new MusicalInterval(note, other);
                if ( interval.class != 6 && !interval.isPMm() ) {
                    note.swapAccidental();
                    if ( size < 7 && !interval.isPMm() )
                        other.swapAccidental();
                }
            }

            /** @param {MusicalNote} note @param {MusicalNote} other @param {Boolean} try_other */
            function makeIntervalGoodExceptBCEF(note, other, try_other = false) {
                const interval = new MusicalInterval(note, other);
                if ( ( !BCEF.includes(note.class) && note.isAltered() )
                     && ( !interval.isPMm() ) )
                        note.swapAccidental();
                if ( try_other 
                     && ( !BCEF.includes(other.class) && other.isAltered() )
                     && ( !interval.isPMm() ) )
                        other.swapAccidental();
            }

            /** @param {MusicalNote} note @param {MusicalNote} other */
            function makeNotesDifferent(note, other) {
                if ( note.diatonic_class == other.diatonic_class )
                    note.swapAccidental();
            }

            /** @param {MusicalNote} note @param {MusicalNote} other */
            function makeNoteBeAbove(note, other) {
                if ( note.pitch > other.pitch && note.diatonic_index < other.diatonic_index )
                    note.swapAccidental();
            }

            /** @param {...MusicalNote[]} versions @returns {MusicalScale} */
            function selectBestNotesVersion(...versions) {
                // Selects the version with lowest score.
                let best_score = Number.MAX_SAFE_INTEGER;
                let best_notes = null;
                for ( const notes of versions ) {
                    // Score repeated notes
                    let same_note_count = pairwise(notes, true).filter(
                        ([a,b]) => ( b.diatonic_class == a.diatonic_class )
                    ).length;
                    // Score augmented and diminished intervals
                    let aug_dim_count = pairwise(notes).filter(
                        ([a,b]) => ( ! new MusicalInterval(a, b).isPMm() )
                    ).length;
                    // Score unnecessary accidentals
                    const acc_count = notes.filter( (note) => note.isAltered() ).length;
                    // Score explicit naturals
                    const nat_count = pairwise(notes).filter(
                        ([a,b]) => a.diatonic_index == b.diatonic_index
                            && a.isAltered() && b.isNatural()
                    ).length;
                    // Score altered BCEF
                    let alt_bcef_score = notes.reduce( (sum, note) => 
                        sum += ( note.isAltered() )
                            ? [1.1,0,0,0,1,1,0,0,0,0,0,1.1][note.class] : 0, 0
                    );
                    // Change weights in some cases
                    if ( size < 8 ) {
                        same_note_count *= 6;
                        if ( size < 7 ) {
                            aug_dim_count *= 3;
                            if ( size > 4 ) 
                                alt_bcef_score *= 3;
                        }
                    }
                    const score = same_note_count + aug_dim_count + acc_count + nat_count + alt_bcef_score;
                    if ( score < best_score ) {
                        best_score = score;
                        best_notes = notes;
                    }
                }
                return best_notes;
            }

            /** @param {MusicalNote[]} notes @param {Number} interval_class */
            function consecutiveInterval(notes, interval_class, loop = true) {
                let now = 0;
                let max = 0;
                for ( const [a,b] of pairwise(loop ? notes.concat(notes) : notes) ) {
                    if ( new MusicalInterval(a,b).class == interval_class )
                        now++;
                    else
                        now = 0;
                    if ( now > max ) max = now;
                }
                return max;
            }

            const thirdsCount = pairwise(this.#notes, true).filter(
                ([a,b]) => [3,4].includes(new MusicalInterval(a, ( (note)=>{
                    const new_note = note.clone();
                    new_note.transposeOctaves(1);
                    return new_note;
                } )(b)).semitones_reduced)
            ).length;

            if ( size <= 2 ) {

                // console.log(
                //     "makeIdealDistribution():\n" +
                //     "Using Algorithm 1 (singletons/dyads)\n" +
                //     `set=[${this.#notes.map((note)=>note.class).join()}] ` +
                //     `size=${size}, thirdsCount=${thirdsCount}`
                // );

                for ( const [a,b] of pairwise(this.#notes) )
                    makeIntervalGoodExceptBCEF(b, a, true);

            } else if ( size <= 4 && thirdsCount >= size-1 ) {

                // Algorithm for chords made of stacked thirds. Creates two 
                // different versions and selects the best of them.

                // console.log(
                //     "makeIdealDistribution():\n" +
                //     "Using Algorithm 3 (thirds-based chord)\n" +
                //     `set=[${this.#notes.map((note)=>note.class).join()}] ` +
                //     `size=${size}, thirdsCount=${thirdsCount}`
                // );

                const notesv1 = this.#notes.map( (note) => note.clone() );
                notesv1[0].lock();
                for ( const [a,b] of pairwise(notesv1, true) )
                    makeIntervalGood(b, a);
                
                const notesv2 = this.#notes.map( (note) => note.clone() );
                notesv2[0].lock();
                for ( const [a,b] of pairwise(notesv2, false) )
                    makeIntervalGood(b, a);
                
                const notesv3 = this.#notes.map( (note) => note.clone() );
                notesv3[0].swapAccidental();
                notesv3[0].lock();
                for ( const [a,b] of pairwise(notesv3, true) )
                    makeIntervalGood(b, a);

                const notesv4 = this.#notes.map( (note) => note.clone() );
                notesv4[0].swapAccidental();
                notesv4[0].lock();
                for ( const [a,b] of pairwise(notesv4, false) )
                    makeIntervalGood(b, a);

                this.#notes = selectBestNotesVersion(notesv1, notesv2, notesv3, notesv4);

            } else if ( size > 7 || consecutiveInterval(this.#notes, 1) >= 2 ) {

                // Algorithm for scales with more than 7 notes or
                // 2 or more consecutive semitones. Avoids aug/dim
                // intervals while keeping BCEF intact.

                // console.log(
                //     "makeIdealDistribution():\n" +
                //     "Using Algorithm 2 (big or chromatic sets)\n" +
                //     `set=[${this.#notes.map((note)=>note.class).join()}] ` +
                //     `size=${size}, thirdsCount=${thirdsCount}`
                // );

                if ( BCEF.includes(this.#notes[0].class) ) this.#notes[0].lock();
                for ( const [a,b] of pairwise(this.#notes) )
                    makeIntervalGoodExceptBCEF(b, a);
                for ( const [a,b] of pairwise(this.#notes).reverse() )
                    makeIntervalGoodExceptBCEF(a, b);

            } else {

                // Algorithm for scales with less than 8 notes. Creates 
                // three different versions and selects the best of them.

                // console.log(
                //     "makeIdealDistribution():\n" +
                //     "Using Algorithm 4 (scales up to 7 notes)\n" +
                //     `set=[${this.#notes.map((note)=>note.class).join()}] ` +
                //     `size=${size}, thirdsCount=${thirdsCount}`
                // );

                const notesv1 = this.#notes.map( (note) => note.clone() );
                for ( const [a,b] of pairwise(notesv1) )
                    makeIntervalGood(b, a);
                makeNotesDifferent(notesv1[last_index], notesv1[0]);
                notesv1[last_index].lock();
                for ( const [a,b] of pairwise(notesv1).reverse() ) {
                    makeNotesDifferent(b, a);
                    makeNoteBeAbove(b, a);
                }
                makeNotesDifferent(notesv1[last_index], notesv1[0]);

                const notesv2 = notesv1.map( (note) => note.clone() );
                notesv2.forEach( (note) => note.swapAccidental() );
                for ( const [a,b] of pairwise(notesv2) )
                    makeIntervalGood(b, a);
                makeNotesDifferent(notesv2[0], notesv2[last_index]);
                for ( const [a,b] of pairwise(notesv2.slice(1)).reverse() ) {
                    makeNotesDifferent(b, a);
                    makeNoteBeAbove(b, a);
                }
                makeNotesDifferent(notesv2[last_index], notesv2[0]);

                const notesv3 = this.#notes.map( (note) => note.clone() );
                for ( const [a,b] of pairwise(notesv3) )
                    makeIntervalGoodExceptBCEF(b, a, true);
                makeNotesDifferent(notesv3[last_index], notesv3[0]);
                notesv3[last_index].lock();
                for ( const [a,b] of pairwise(notesv3).reverse() ) {
                    makeIntervalGoodExceptBCEF(a, b);
                    makeNotesDifferent(b, a);
                    makeNoteBeAbove(b, a);
                }
                makeNotesDifferent(notesv3[last_index], notesv3[0]);

                this.#notes = selectBestNotesVersion(notesv1, notesv2, notesv3);
                
            }

            // Avoid two equally-named consecutive notes if the first is altered.
            for ( const [a,b] of pairwise(this.#notes, true) )
                if ( a.isAltered() )
                    makeNotesDifferent(a, b);

        }

        // Restore original locks
        this.#notes.forEach( (note,i) => note.locked = locked_notes[i] );
    
    }

}
