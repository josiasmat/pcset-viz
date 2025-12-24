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
    
    gain : 0.5,
    fade_in : 0.05,
    fade_out : 0.05,
    
    /** @type {AudioContext?} */
    audio_ctx : null,
    /** @type {Array.<OscillatorNode[]>} */
    oscillators : Array(12).fill(null),
    /** @type {GainNode[]} */
    gains : Array(12).fill(null),
    base_freqs : [
        32.7, 34.65, 36.71, 38.89, 20.6, 21.83, 
        23.12, 24.5, 25.96, 27.5, 29.14, 30.87
    ],

    playing : Array(12).fill(false),
    timeouts : Array(12).fill(null),

    createOscillator(pc) {
        const real = new Float32Array(257).fill(0.0);
        const imag = new Float32Array(257).fill(0.0);
        for ( let i = 1; i <= 512; i*=2 ) real[i] = 1.0;
        const osc = this.audio_ctx.createOscillator();
        osc.setPeriodicWave(
            this.audio_ctx.createPeriodicWave(real, imag, { disableNormalization: false})
        );
        osc.frequency.setValueAtTime(this.base_freqs[pc], this.audio_ctx.currentTime);
        osc.connect(this.gains[pc]);
        osc.start();
        this.oscillators[pc] = osc;
        return osc;
    },

    isAudioRunning() {
        return ( this.audio_ctx?.state == "running" );
    },

    initialize() {
        this.audio_ctx = new AudioContext();
        const lpf = new BiquadFilterNode(this.audio_ctx, {type: "lowpass", Q: 0.6, frequency: 1800});
        const hpf = new BiquadFilterNode(this.audio_ctx, {type: "highpass", Q: 1, frequency: 130});
        lpf.connect(this.audio_ctx.destination);
        hpf.connect(lpf);
        for ( let pc = 0; pc < 12; pc++ ) {
            const g = this.audio_ctx.createGain();
            g.gain.value = 0;
            g.connect(hpf);
            this.gains[pc] = g;
            this.createOscillator(pc);
        }
    },

    resume() {
        if ( !this.audio_ctx ) 
            this.initialize();
        return this.audio_ctx.resume();
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
        this.gains[pc].gain.cancelScheduledValues(now);
        this.gains[pc].gain.setValueAtTime(from, now + delay);
        this.gains[pc].gain.linearRampToValueAtTime(to, end);
        return end;
    },

    playPitch(pitch, duration = 0, delay = 0) {
        if ( !this.isAudioRunning() ) {
            document.body.style.setProperty("cursor", "progress", "important");
            this.resume().then(() => {
                this.playPitch(pitch, duration, delay);
                document.body.style.removeProperty("cursor");
            });
            return;
        }
        const pc = pitch%12;
        if ( !this.playing[pc] ) {
            this.playing[pc] = true;
            this.setGradualGainChange(pc, 0, this.gain, this.fade_in, delay);
        }
        if ( this.timeouts[pc] ) clearTimeout(this.timeouts[pc]);
        if ( duration > 0 ) {
            this.timeouts[pc] = setTimeout(() => { 
                this.timeouts[pc] = null;
                this.stopPitch(pitch); 
            }, 1000*(delay+duration));
        }
    },

    stopPitch(pitch, delay = 0) {
        if ( !this.isAudioRunning() )
            return;
        const pc = pitch%12;
        if ( this.playing[pc] ) {
            this.setGradualGainChange(pc, this.gain, 0, this.fade_out, delay);
            this.playing[pc] = false;
        }
    },

    stopAll() {
        for ( let pc = 0; pc < 12; pc++ ) {
            if ( this.timeouts[pc] ) {
                clearTimeout(this.timeouts[pc]);
                this.timeouts[pc] = null;
            }
            this.gains[pc].gain.cancelScheduledValues(this.audio_ctx.currentTime);
            this.gains[pc].gain.value = 0;
            // this.setGradualGainChange(pc, this.gain, 0, this.fade_out);
            this.playing[pc] = false;
        }
    },

    /**
     * @param {Number[]} pitches 
     * @param {Number} pitch_duration 
     */
    playScale(pitches, pitch_duration) {
        if ( !this.isAudioRunning() ) {
            document.body.style.setProperty("cursor", "progress", "important");
            this.resume().then(() => {
                this.playScale(pitches, pitch_duration);
                document.body.style.removeProperty("cursor");
            });
            return;
        }
        this.stopAll();
        setTimeout(() => {
            for ( let i = 0; i < pitches.length; i++ ) {
                const delay = i * pitch_duration;
                this.playPitch(pitches[i], pitch_duration, delay);
            }
        }, 50);
    },

}
