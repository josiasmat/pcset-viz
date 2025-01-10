/*
Pitch-class set visualizer - Audio-related routines
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


const PitchPlayer = {
    
    gain : 0.1,
    fade_in : 0.05,
    fade_out : 0.05,
    
    /** @type {AudioContext?} */
    audio_ctx : null,
    oscillators : Array(12).fill(null),
    gains : Array(12).fill(null),
    base_freqs : [
        32.7, 34.65, 36.71, 38.89, 20.6, 21.83, 
        23.12, 24.5, 25.96, 27.5, 29.14, 30.87
    ],

    createOscillator(pc) {
        const base_freq = this.base_freqs[pc];
        this.oscillators[pc] = [];
        const now = this.audio_ctx.currentTime;
        for ( let f = base_freq; f < 20000; f*=2 ) {
            const osc = this.audio_ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(f, now); 
            osc.connect(this.gains[pc]);
            this.oscillators[pc].push(osc);
        }
    },

    destroyOscillator(pc) {
        for ( const osc of this.oscillators[pc] ) {
            osc.disconnect(this.gains[pc]);
        }
        this.oscillators[pc] = null;
    },

    createOscillators() {
        for ( let pc = 0; pc < 12; pc++ )
            this.createOscillator(pc);
    },

    initialize() {
        this.audio_ctx = new AudioContext();
        const lpf = new BiquadFilterNode(this.audio_ctx, {type: "lowpass", Q: 0.4, frequency: 2000});
        const hpf = new BiquadFilterNode(this.audio_ctx, {type: "highpass", Q: 1, frequency: 130});
        lpf.connect(this.audio_ctx.destination);
        hpf.connect(lpf);
        for ( let pc = 0; pc < 12; pc++ ) {
            const g = this.audio_ctx.createGain();
            g.gain.value = 0;
            g.connect(hpf);
            // g.connect(this.audio_ctx.destination);
            this.gains[pc] = g;
        }
    },

    /**
     * @param {Number} pc    - Pitch class
     * @param {Number} from  - Initial gain
     * @param {Number} to    - Final gain
     * @param {Number} ramp  - Ramp/fade time, in seconds (default is 0)
     * @param {Number} delay - Delay time, in seconds (default is 0)
     * @returns {Number} - Time at which the gain ramp should be finished.
     */
    setGradualGainChange(pc, from, to, ramp = 0, delay = 0) {
        const now = this.audio_ctx.currentTime;
        const end = now + ramp + delay;
        this.gains[pc].gain.setValueAtTime(from, now + delay);
        this.gains[pc].gain.linearRampToValueAtTime(to, end);
        return end;
    },

    playPitch(pitch, duration = 0, delay = 0) {
        if ( this.audio_ctx == null )
            this.initialize();
        const pc = pitch%12;
        if ( !this.oscillators[pc] ) {
            this.createOscillator(pc);
            this.setGradualGainChange(pc, 0, this.gain, this.fade_in, delay);
            for ( const osc of this.oscillators[pc] )
                osc.start();
        }
        if ( duration > 0 )
            this.stopPitch(pitch, delay + duration);
    },

    stopPitch(pitch, delay = 0) {
        const pc = pitch%12;
        if ( this.oscillators[pc] ) {
            const end_time = this.setGradualGainChange(pc, this.gain, 0, this.fade_out, delay);
            for ( const osc of this.oscillators[pc] ) {
                osc.addEventListener("ended", (e) => { e.target.disconnect(this.gains[pc]); });
                osc.stop(end_time);
            }
            this.oscillators[pc] = null;
        }
    }

}
