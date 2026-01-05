/*
Pitch-class set visualizer - MIDI-related routines
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


const MIDI_MODES = ["accumulate","chord","direct","toggle"];

const midi = {
    dev: null,
    channels: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
    mode: MIDI_MODES[1],
    keys: Array(128).fill(false),
    pcs: Array(12).fill(0),
    notes: Array(128).fill(false),
    pedal: {
        /** @type {Boolean} */
        enabled: false,
        /** @type {Boolean} */
        pressed: false,
        enable() {
            this.enabled = true;
            this.pressed = false;
        },
        disable() {
            this.enabled = false;
            this.pressed = false;
        },
    },
    /** @type {(pc: Number)=>Void?} */
    on_pc_on: null,
    /** @type {(pc: Number)=>Void?} */
    on_pc_off: null,
    keyPressed(key) {
        return ( this.pedal.enabled && this.pedal.pressed )
            ? this.notes[key] : this.keys[key];
    },
    setNoteOn(key) {
        this.keys[key] = true;
        this.notes[key] = true;
        const pc = key % 12;
        this.pcs[pc] += 1;
        if ( this.pcs[pc] == 1 ) this.on_pc_on?.(pc);
    },
    setNoteOff(key) {
        this.keys[key] = false;
        const pc = key % 12;
        if ( !this.pedal.enabled || !this.pedal.pressed ) {
            this.notes[key] = false;
            this.pcs[pc] = Math.max(this.pcs[pc]-1, 0);
        }
        if ( this.pcs[pc] == 0 ) 
            this.on_pc_off?.(pc);
    },
    setPedal(int_value) {
        if ( this.pedal.enabled ) {
            this.pedal.pressed = (int_value >= 64);
            if ( !this.pedal.pressed ) {
                this.notes = Array.from(this.keys);
                this.pcs = Array(12).fill(0);
                this.notes.forEach((on, key) => {
                    if ( on ) this.pcs[key] += 1;
                });
                this.pcs.forEach((n,pc) => {
                    if ( !n ) this.on_pc_off?.(pc);
                });
            }
            return this.pedal.pressed;
        }
        return false;
    },
    resetNotes() {
        this.keys = Array(128).fill(false);
        this.pcs = Array(12).fill(0);
        this.notes = Array(128).fill(false);
        this.pedal.pressed = false;
        if ( this.on_pc_off )
            for ( let pc = 0; pc < 12; pc++ )
                this.on_pc_off(pc);
    },
    last_event_timestamp: 0,
    last_event_time_delta: 0,
    pedal_reset: false
}

const config_midi_storage = new LocalStorageHandler("pcsetviz-midi");


function requestMidiPermission(callback_prompt, callback_granted, callback_denied) {
    navigator.permissions.query({ name: "midi", sysex: false })
    .then((perm) => {
        console.log(perm.state);
        switch ( perm.state ) {
            case "granted":
                callback_granted?.();
                break;
            case "denied":
                callback_denied?.();
                break;
            default:
                callback_prompt?.();
        }
    });
}


/**
 * Request a list of MIDI inputs.
 * @param {Function} callback a function accepting an array of 
 *      MIDIInput objects.
 */
function requestMidiInputs(callback_ok, callback_fail) {
    if ( navigator.requestMIDIAccess ) {
        navigator.requestMIDIAccess().then((access) => {
            const ports = [];
            if ( access.inputs.size > 0 ) {
                for ( const port of access.inputs.values() )
                    ports.push(port);
            }
            callback_ok?.(ports);
        }, callback_fail);
    }
}


function selectMidiDevice() {
    const midi_select_elm = document.getElementById("select-midi-device");
    const port_id = midi_select_elm.value;
    if ( midi.dev ) {
        midi.dev.removeEventListener("midimessage", handleMIDIEvent);
        midi.dev = null;
    }
    if ( port_id == "" ) {
        updateConfigMidiStatus(
            i18n.get("options-midi-disconnected", "Disconnected"), 0
        );
        saveMidiConfig();
    } else {
        connectMidiDeviceById(port_id, updateConfigMidiStatus);
    }
}


function connectMidiDeviceByName(port_name, msg_func = null) {
    if ( navigator.requestMIDIAccess ) {
        if ( msg_func ) msg_func(
            i18n.get("options-midi-connecting", "Connecting…"), 2
        );
        requestMidiInputs((ports) => {
            for ( const port of ports ) {
                if ( port.name == port_name ) {
                    midi.dev = port;
                    port.addEventListener("midimessage", handleMIDIEvent);
                    console.log(`Connected to MIDI device "${port.name}".`);
                    if ( msg_func ) msg_func(
                        i18n.get("options-midi-connected", "Connected"), 1
                    );
                    saveMidiConfig();
                    return;
                }
            }
            console.log(`Unable to connect to MIDI device with name "${port_name}".`);
            if ( msg_func ) msg_func(
                i18n.get("options-midi-fail", "Failed connection"), 3
            );
        }, () => { 
            console.log("MIDI access denied.");
            if ( msg_func ) msg_func(
                i18n.get("options-midi-denied", "MIDI access denied"), 3
            );
        });
    }
}


function connectMidiDeviceById(port_id, msg_func = null) {
    if ( navigator.requestMIDIAccess ) {
        if ( msg_func ) msg_func(
            i18n.get("options-midi-connecting", "Connecting…"), 2
        );
        requestMidiInputs((ports) => {
            for ( const port of ports ) {
                if ( port.id == port_id ) {
                    midi.dev = port;
                    port.addEventListener("midimessage", handleMIDIEvent);
                    console.log(`Connected to MIDI device "${port.name}".`);
                    if ( msg_func ) msg_func(
                        i18n.get("options-midi-connected", "Connected"), 1
                    );
                    saveMidiConfig();
                    return;
                }
            }
            console.log(`Unable to connect to MIDI device with id "${port_id}".`);
            if ( msg_func ) msg_func(
                i18n.get("options-midi-fail", "Failed connection"), 3
            );
        }, () => { 
            console.log("MIDI access denied.");
            if ( msg_func ) msg_func(
                i18n.get("options-midi-denied", "MIDI access denied"), 3
            );
        });
    }
}


/** @param {MIDIMessageEvent} ev */
function handleMIDIEvent(ev) {
    //console.log(`Received MIDI data: ${ev.data}`);
    const time_delta = ev.timeStamp - midi.last_event_timestamp;
    for ( const ch of midi.channels ) {
        switch ( ev.data[0] ) {
            case 0x90 + ch: // note on
                midi.last_event_timestamp = ev.timeStamp;
                midi.last_event_time_delta = time_delta;
                setNoteOn(ev.data[1]);
                break;
            case 0x80 + ch: // note off
                midi.last_event_timestamp = ev.timeStamp;
                midi.last_event_time_delta = time_delta;
                setNoteOff(ev.data[1]);
                break;
            case 0xB0 + ch: // controller change
                if ( ev.data[1] == 64 && midi.pedal.enabled ) {
                    // sustain pedal change
                    midi.last_event_timestamp = ev.timeStamp;
                    midi.last_event_time_delta = time_delta;
                    const ped_old_state = midi.pedal.pressed;
                    const ped_new_state = midi.setPedal(ev.data[2]);
                    if ( ped_old_state && (!ped_new_state) )
                        midi.pedal_reset = true;
                    updatePlayedNotes();
                } else if ( ev.data[1] == 123 ) {
                    // all notes off
                    setAllNotesOff();
                }
                break;
            default:
                continue;
        }
        console.log(
            "handleMIDIEvent()\n" +
            `  Event type: ${
                ev.data[0] == 0x90+ch ? "note on" : 
                ev.data[0] == 0x80+ch ? "note off" :
                ev.data[0] == 0xB0+ch && ev.data[1] == 64 ? "sustain pedal change" :
                ev.data[0] == 0xB0+ch && ev.data[1] == 123 ? "midi panic" :
                `ev.data[0] == ${ev.data[0]}; ev.data[1] == ${ev.data[1]}`
            }\n` + 
            "MIDI state:\n" +
            // `  midi.keys == ${midi.keys.toString()}\n` +
            // `  midi.notes == ${midi.notes.toString()}\n` +
            `  midi.pcs == ${midi.pcs.toString()}\n` +
            `  midi.pedal.enabled == ${midi.pedal.enabled}\n` +
            `  midi.pedal.pressed == ${midi.pedal.pressed}`
        );
    }
}


/** @param {Number} key */
function setNoteOn(key) {
    midi.setNoteOn(key);
    updatePlayedNotes(key, true);
}


/** @param {Number} key */
function setNoteOff(key) {
    midi.setNoteOff(key);
    updatePlayedNotes(key, false);
}


function setAllNotesOff() {
    midi.resetNotes();
    updatePlayedNotes();
}


function midiPanic() {
    setAllNotesOff();
}


/**
 * @param {Number?} [key] 
 * @param {Boolean} [note_on] 
 */
function updatePlayedNotes(key = null, note_on = false) {
    const pc = (key != null) ? (key % 12) : null;
    const first_on = note_on ? (midi.pcs[pc] == 1) : false;
    const previous_pcset = state.pcset.clone();
    switch ( midi.mode ) {
        case "direct":
            state.pcset = new PcSet(midi.notes.reduce(
                (r,k,i) => { if (k) r.push(mod12(i)); return r; }, []
            ));
            break;
        case "toggle":
            if ( first_on )
                state.pcset.toggle(mod12(key));
            break;
        case "chord":
            if ( note_on ) {
                state.pcset = new PcSet(midi.notes.reduce(
                    (r,k,i) => { if (k) r.push(mod12(i)); return r; }, []
                ));
            }
            break;
        case "scale":
            if ( key != null ) {
                const count = midi.notes.reduce( (sum,k) => sum += (k ? 1 : 0), 0 );
                if ( count == 1 && first_on && (
                    midi.last_event_time_delta >= 300 || midi.pedal_reset
                ) )
                    state.pcset = new PcSet([pc]);
                else if ( midi.pcs[pc] > 0 )
                    state.pcset.add(pc);
            }
            break;
        case "accumulate":
            if ( key != null ) {
                const count = midi.notes.reduce( (sum,k) => sum += (k ? 1 : 0), 0 );
                if ( count == 1 && first_on )
                    state.pcset = new PcSet([pc]);
                else if ( midi.pcs[pc] > 0 )
                    state.pcset.add(pc);
            }
    }
    if ( !state.pcset.isEqualTo(previous_pcset) ) {
        state.last_op = null;
        showPcset({history_delay: 300, polygon_delay: 150});
    }
    if ( note_on && midi.pedal_reset )
        midi.pedal_reset = false;
}


function loadMidiConfig() {
    midi.mode = config_midi_storage.readString("mode", MIDI_MODES[1]);
    if ( config_midi_storage.readBool("pedal", false) )
        midi.pedal.enable();
    else
        midi.pedal.disable();
    const dev_name = config_midi_storage.readString("last-device-name", "");
    if ( dev_name )
        connectMidiDeviceByName(dev_name);
    midi.on_pc_on  = (pc) => { if ( config.sound_midi ) PitchPlayer.playPitch(pc) };
    midi.on_pc_off = (pc) => { if ( config.sound_midi ) PitchPlayer.stopPitch(pc) };
}

function saveMidiConfig() {
    config_midi_storage.writeString("mode", midi.mode);
    config_midi_storage.writeString("pedal", midi.pedal.enabled);
    config_midi_storage.writeString("last-device-name", midi.dev ? midi.dev.name : "");
}


loadMidiConfig();
