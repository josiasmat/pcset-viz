/*
Pitch-class set visualizer
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


function showConfigDialog() {
    updateConfigDialog();
    showDialog("dialog-config");
}

function hideConfigDialog() {
    hideDialog("dialog-config");
}

function addLanguageToConfig(code, name) {
    const checkboxes_area = document.getElementById("options-language-checkboxes-area");
    const new_html = `<span><input id="radio-lang-${code}" type="radio" name="lang" value="${code}" onchange="onChange()">`+
                     `&nbsp;<label for="radio-lang-${code}">${name}</label></span>`;
    checkboxes_area.setHTMLUnsafe(checkboxes_area.innerHTML + new_html);
    document.getElementById("options-language-row").hidden = false;
}


/**
 * @param {String} text 
 * @param {Number} value 0 = gray, 1 = blue, 2 = green, 3 = red
 */
function updateConfigMidiStatus(text, value) {
    const midi_status_elm = document.getElementById("midi-connection-status");
    midi_status_elm.setAttribute("status", value.toString());
    midi_status_elm.innerHTML = text;
}


function updateConfigDialog() {
    const checkboxes = document.querySelectorAll("#visible-data-checkboxes-area input");
    for ( let checkbox of checkboxes ) {
        const target_id = checkbox.getAttribute("target");
        const target_elm = document.getElementById(target_id);
        checkbox.checked = !(target_elm.hasAttribute("hidden"));
    }
    document.getElementById("select-midi-mode").value = midi.mode;
    const midi_pedal_elm = document.getElementById("chk-midi-pedal");
    midi_pedal_elm.value = midi.pedal.enabled;
    midi_pedal_elm.disabled = (midi.mode == "toggle");
    const midi_select_elm = document.getElementById("select-midi-device");
    clearSelectOptions(midi_select_elm);
    const options = [addOptionToHtmlSelect(
        midi_select_elm, "", i18n.get("options-midi-device-none", "No device available")
    )];
    requestMidiInputs( (ports) => {
        if ( ports.length > 0 )
            options[0].setAttribute(
                "label", i18n.get("options-midi-device-null", "No device selected")
            );
        for ( const port of ports ) {
            options.push(addOptionToHtmlSelect(
                midi_select_elm, port.id, port.name,
                ( midi.dev 
                    && midi.dev.name == port.name 
                    && midi.dev.state == "connected" )
            ));
        }
        if ( options.length > 1 )
            midi_select_elm.insertBefore(options[0], options[1]);
        if ( midi.dev )
            updateConfigMidiStatus(i18n.get("options-midi-connected", "Connected"), 1);
        else
            updateConfigMidiStatus(i18n.get("options-midi-disconnected", "Disconnected"), 0);
        //selectMidiDevice();
    }, () => {
        updateConfigMidiStatus(i18n.get("options-midi-denied", "MIDI access denied"), 3);
    });
}


function selectMidiMode() {
    midi.mode = document.getElementById("select-midi-mode").value;
    const midi_pedal_elm = document.getElementById("chk-midi-pedal");
    midi.pedal.enabled = midi_pedal_elm.checked;
    midi_pedal_elm.disabled = (midi.mode == "toggle");
    saveMidiConfig();
}


function resetVisibleDataRows() {
    Table.rows.forEach( (row) => { row.visible = row.default } );
    updateConfigDialog();
    saveConfig();
}

function setAllDataRowsVisible() {
    Table.rows.forEach( (row) => { row.show() } );
    updateConfigDialog();
    saveConfig();
}

function showAboutDialog() {
    document.getElementById("version-number").innerText = VERSION;
    showDialog("dialog-about");
}

function elementDisableFocus(elm) {
    elm.setAttribute("tabindex", "-1");
    for ( const child of elm.children ) elementDisableFocus(child);
}

function elementEnableFocus(elm) {
    elm.removeAttribute("tabindex");
    for ( const child of elm.children ) elementEnableFocus(child);
}

function showDialog(id) {
    const dialog_elm = document.getElementById(id);
    dialog_elm.addEventListener("close", (e) => {
        e.currentTarget.style.removeProperty("width");
        e.currentTarget.style.removeProperty("height");
    });
    dialog_elm.showModal();
}

function hideDialog(id) {
    const dialog_elm = document.getElementById(id);
    dialog_elm.close();
}

function hideAllDialogs() {
    for ( let dialog of document.querySelectorAll(".dialog-container") )
        hideDialog(dialog.id);
}

function handleDialogClick(e) {
    if ( this == e.target ) {
        const rect = this.getBoundingClientRect();
        if ( !isInsideRect(rect, e.clientX, e.clientY) )
            hideDialog(this.id);
    }
}

// Make all dialogs close when clicked outside them
for ( const dg of document.querySelectorAll("dialog.dialog-container") ) {
    dg.addEventListener("click", handleDialogClick, { passive: true });
}

// Make close buttons
for ( const elm of Array.from(document.querySelectorAll(".close-button")) ) {
    const svg = SvgTools.createRootElement({
         "class": "svg-icon",
         "viewbox": [0, 0, SVG_ICONS.close.w, SVG_ICONS.close.h].join(' ')
    });
    svg.appendChild(
        SvgTools.makePath(SVG_ICONS.close.d)
    );
    elm.setHTMLUnsafe(svg.outerHTML);
}
