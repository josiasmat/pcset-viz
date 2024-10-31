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
    navigator.requestMIDIAccess().then((access) => {
        const ports = [];
        if ( access.inputs.size > 0 ) {
            for ( const port of access.inputs.values() )
                ports.push(port);
        }
        callback_ok(ports);
    }, callback_fail);
}


function selectMidiDevice() {
    const midi_select_elm = document.getElementById("select-midi-device");
    const midi_status_elm = document.getElementById("midi-connection-status");
    const port_id = midi_select_elm.value;
    if ( midi.dev ) {
        midi.dev.removeEventListener("midimessage", handleMIDIEvent);
        midi.dev = null;
    }
    if ( port_id == "" ) {
        midi_status_elm.setHTMLUnsafe("Disconnected");
        saveMidiConfig();
    } else {
        connectMidiDeviceById(port_id, midi_status_elm);
    }
}


function connectMidiDeviceByName(port_name, msg_element = null) {
    if ( msg_element ) msg_element.innerText = "Connecting...";
    requestMidiInputs((ports) => {
        for ( const port of ports ) {
            if ( port.name == port_name ) {
                midi.dev = port;
                port.addEventListener("midimessage", handleMIDIEvent);
                console.log(`Connected to MIDI device "${port.name}".`);
                if ( msg_element ) msg_element.innerText = "Connected";
                saveMidiConfig();
                return;
            }
        }
        console.log(`Unable to connect to MIDI device with name "${port_name}".`);
        if ( msg_element ) msg_element.innerText = "Failed connection";
    }, () => { 
        console.log("MIDI access denied.");
        if ( msg_element ) msg_element.innerText = "MIDI access denied";
    });
}


function connectMidiDeviceById(port_id, msg_element = null) {
    if ( msg_element ) msg_element.innerText = "Connecting...";
    requestMidiInputs((ports) => {
        for ( const port of ports ) {
            if ( port.id == port_id ) {
                midi.dev = port;
                port.addEventListener("midimessage", handleMIDIEvent);
                console.log(`Connected to MIDI device "${port.name}".`);
                if ( msg_element ) msg_element.innerText = "Connected";
                saveMidiConfig();
                return;
            }
        }
        console.log(`Unable to connect to MIDI device with id "${port_id}".`);
        if ( msg_element ) msg_element.innerText = "Failed connection"; 
    }, () => { 
        console.log("MIDI access denied.");
        if ( msg_element ) msg_element.innerText = "MIDI access denied"; 
    });
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
                if ( ev.data[1] == 123 )
                    setAllNotesOff();
        }
    }
}


function setNoteOn(key) {
    midi.keys[key] = true;
    const pc = mod12(key);
    midi.pcs[pc] += 1;
    updatePlayedNotes(key, pc, true, (midi.pcs[pc] == 1));
}


function setNoteOff(key) {
    midi.keys[key] = false;
    const pc = mod12(key);
    midi.pcs[pc] = Math.max(midi.pcs[pc]-1, 0);
    updatePlayedNotes(key, pc, false);
}


function setAllNotesOff() {
    midi.keys = Array(128).fill(false);
    midi.pcs = Array(12).fill(0);
    updatePlayedNotes();
}


function updatePlayedNotes(key = null, pc = null, note_on = false, first_on = false) {
    switch ( midi.mode ) {
        case "direct":
            state.pcset = new PcSet(midi.keys.reduce(
                (r,k,i) => { if (k) r.push(mod12(i)); return r; }, []
            ));
            break;
        case "toggle":
            if ( first_on )
                state.pcset.toggle(mod12(key));
            break;
        case "chord":
            if ( note_on ) {
                state.pcset = new PcSet(midi.keys.reduce(
                    (r,k,i) => { if (k) r.push(mod12(i)); return r; }, []
                ));
            }
            break;
        case "accumulate":
            if ( key != null ) {
                const sum = midi.keys.reduce( (sum,k) => sum += k ? 1 : 0, 0 );
                if ( sum == 1 && first_on )
                    state.pcset = new PcSet([pc]);
                else if ( midi.pcs[pc] > 0 )
                    state.pcset.add(pc);
            }
    }
    showPcset({history_delay: 250, polygon_delay: 100});
}


function selectMidiMode() {
    midi.mode = document.getElementById("select-midi-mode").value;
    saveMidiConfig();
}

function loadMidiConfig() {
    midi.mode = config_midi_storage.readString("mode", MIDI_MODES[1]);
    const dev_name = config_midi_storage.readString("last-device-name", "");
    if ( dev_name )
        connectMidiDeviceByName(dev_name);
}

function saveMidiConfig() {
    config_midi_storage.writeString("mode", midi.mode);
    config_midi_storage.writeString("last-device-name", midi.dev ? midi.dev.name : "");
}


loadMidiConfig();
