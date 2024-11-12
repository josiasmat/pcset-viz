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
        enabled: false,
        pressed: false,
    },
    keyPressed(key) {
        return ( this.pedal.enabled && this.pedal.pressed )
            ? this.keys[key] : this.notes[key];
    },
    setNoteOn(key) {
        const pc = key % 12;
        this.keys[key] = true;
        this.pcs[pc] += 1;
        this.notes[key] = true;
        return pc;
    },
    setNoteOff(key) {
        const pc = key % 12;
        this.keys[key] = false;
        this.pcs[pc] = Math.max(this.pcs[pc]-1, 0);
        if ( !this.pedal.enabled || !this.pedal.pressed )
            this.notes[key] = false;
        return pc;
    },
    setPedal(int_value) {
        this.pedal.pressed = (int_value >= 64);
        if ( !this.pedal.enabled || !this.pedal.pressed )
            this.notes = Array.from(this.keys);
    },
}

const config_midi_storage = new LocalStorageHandler("pcsetviz-midi");


function requestMidiPermission(callback_prompt, callback_granted, callback_denied) {
    navigator.permissions.query({ name: "midi", sysex: false })
        .then((perm) => {
            console.log(perm.state);
            switch ( perm.state ) {
                case "granted":
                    callback_granted();
                    break;
                case "denied":
                    callback_denied();
                    break;
                default:
                    callback_prompt();
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
            callback_ok(ports);
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
        updateConfigMidiStatus("Disconnected", 0);
        saveMidiConfig();
    } else {
        connectMidiDeviceById(port_id, updateConfigMidiStatus);
    }
}


function connectMidiDeviceByName(port_name, msg_func = null) {
    if ( navigator.requestMIDIAccess ) {
        if ( msg_func ) msg_func("Connecting...", 2);
        requestMidiInputs((ports) => {
            for ( const port of ports ) {
                if ( port.name == port_name ) {
                    midi.dev = port;
                    port.addEventListener("midimessage", handleMIDIEvent);
                    console.log(`Connected to MIDI device "${port.name}".`);
                    if ( msg_func ) msg_func("Connected", 1);
                    saveMidiConfig();
                    return;
                }
            }
            console.log(`Unable to connect to MIDI device with name "${port_name}".`);
            if ( msg_func ) msg_func("Failed connection", 3);
        }, () => { 
            console.log("MIDI access denied.");
            if ( msg_func ) msg_func("MIDI access denied", 3);
        });
    }
}


function connectMidiDeviceById(port_id, msg_func = null) {
    if ( navigator.requestMIDIAccess ) {
        if ( msg_func ) msg_func("Connecting...", 2);
        requestMidiInputs((ports) => {
            for ( const port of ports ) {
                if ( port.id == port_id ) {
                    midi.dev = port;
                    port.addEventListener("midimessage", handleMIDIEvent);
                    console.log(`Connected to MIDI device "${port.name}".`);
                    if ( msg_func ) msg_func("Connected", 1);
                    saveMidiConfig();
                    return;
                }
            }
            console.log(`Unable to connect to MIDI device with id "${port_id}".`);
            if ( msg_func ) msg_func("Failed connection", 3);
        }, () => { 
            console.log("MIDI access denied.");
            if ( msg_func ) msg_func("MIDI access denied", 3);
        });
    }
}


function handleMIDIEvent(ev) {
    //console.log(`Received MIDI data: ${ev.data}`);
    for ( const ch of midi.channels ) {
        switch ( ev.data[0] ) {
            case 0x90 + ch:
                setNoteOn(ev.data[1]);
                break;
            case 0x80 + ch:
                setNoteOff(ev.data[1]);
                break;
            case 0xB0 + ch:
                if ( ev.data[1] == 64 ) {
                    midi.setPedal(ev.data[2]);
                    updatePlayedNotes();
                } else if ( ev.data[1] == 123 )
                    setAllNotesOff();
        }
    }
}


function setNoteOn(key) {
    const pc = midi.setNoteOn(key);
    updatePlayedNotes(key, pc, true);
}


function setNoteOff(key) {
    const pc = midi.setNoteOff(key);
    updatePlayedNotes(key, pc, false);
}


function setAllNotesOff() {
    midi.keys = Array(128).fill(false);
    midi.notes = Array(128).fill(false);
    midi.pcs = Array(12).fill(0);
    updatePlayedNotes();
}


function updatePlayedNotes(key = null, pc = null, note_on = false) {
    const first_on = (note_on ? midi.pcs[pc] == 1 : false);
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
        case "accumulate":
            if ( key != null ) {
                const sum = midi.notes.reduce( (sum,k) => sum += k ? 1 : 0, 0 );
                if ( sum == 1 && first_on )
                    state.pcset = new PcSet([pc]);
                else if ( midi.pcs[pc] > 0 )
                    state.pcset.add(pc);
            }
    }
    if ( !state.pcset.isEqualTo(previous_pcset) ) {
        state.last_op = null;
        showPcset({history_delay: 300, polygon_delay: 150});
    }
}


function loadMidiConfig() {
    midi.mode = config_midi_storage.readString("mode", MIDI_MODES[1]);
    midi.pedal.enabled = config_midi_storage.readString("pedal", false);
    const dev_name = config_midi_storage.readString("last-device-name", "");
    if ( dev_name )
        connectMidiDeviceByName(dev_name);
}

function saveMidiConfig() {
    config_midi_storage.writeString("mode", midi.mode);
    config_midi_storage.writeString("pedal", midi.pedal.enabled);
    config_midi_storage.writeString("last-device-name", midi.dev ? midi.dev.name : "");
}


loadMidiConfig();
