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


const SVGNS = "http://www.w3.org/2000/svg";


const viz = {
    svg_root: null,
    svg_main: null,
    viewport: { w: 0, h: 0, min: 0, cx: 0, cy: 0 },
    pitches: Array(12).fill(null),
    pitch_circle_radius: 0,
    pitch_circle_center_distance: 0,
    pitch_circle_border_distance: 0,
    polygon: null,
    intervals_group: null,
    sym_lines_group: null,
    move_line: null,
    arrow_marker: null,
    defs: null,
}

const pc_drag_state = {
    active: false,
    from: null,
    to: null
}

var polygon_update_timer = null;


function createSvg(element) {

    viz.svg_root = element;
    if (viz.svg_main) viz.svg_root.removeChild(viz.svg_main);
    viz.svg_main = document.createElementNS(SVGNS, "g");
    viz.svg_root.appendChild(viz.svg_main);
    
    viz.viewport.w = Number(viz.svg_root.getAttribute("width"));
    viz.viewport.h = Number(viz.svg_root.getAttribute("height"));
    viz.viewport.cx = Math.round(viz.viewport.w / 2);
    viz.viewport.cy = Math.round(viz.viewport.h / 2);
    viz.viewport.min = Math.min(viz.viewport.w, viz.viewport.h);

    viz.pitch_circle_radius = Math.round(viz.viewport.min / 14);
    viz.pitch_circle_center_distance = Math.round((viz.viewport.min / 2) - viz.pitch_circle_radius - 10);
    viz.pitch_circle_border_distance = 
        viz.pitch_circle_center_distance - viz.pitch_circle_radius - Math.round(viz.pitch_circle_radius / 3);

    viz.defs = document.createElementNS(SVGNS, "defs");
    viz.svg_main.appendChild(viz.defs);

    viz.arrow_marker = document.createElementNS(SVGNS, "marker");
    viz.arrow_marker.id = "marker-arrow";
    viz.arrow_marker.setAttribute("viewBox", "0 0 10 10");
    viz.arrow_marker.setAttribute("refX", 5);
    viz.arrow_marker.setAttribute("refY", 5);
    viz.arrow_marker.setAttribute("markerWidth", 4);
    viz.arrow_marker.setAttribute("markerHeight", 4);
    viz.arrow_marker.setAttribute("orient", "auto-start-reverse");
    viz.defs.appendChild(viz.arrow_marker);

    const arrow_marker_path = document.createElementNS(SVGNS, "path");
    arrow_marker_path.setAttribute("fill", "var(--pc-moving-to-stroke)");
    arrow_marker_path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    viz.arrow_marker.appendChild(arrow_marker_path);

    viz.polygon = document.createElementNS(SVGNS, "path");
    viz.polygon.setAttribute("id", "polygon");
    viz.svg_main.appendChild(viz.polygon);

    viz.intervals_group = document.createElementNS(SVGNS, "g");
    viz.intervals_group.setAttribute("id", "viz-intervals");
    viz.svg_main.appendChild(viz.intervals_group);

    viz.sym_lines_group = document.createElementNS(SVGNS, "g");
    viz.sym_lines_group.setAttribute("id", "symmetry-lines");
    viz.svg_main.appendChild(viz.sym_lines_group);
        
    for (let i = 0; i < 12; i++) {
        const p = vizGetPoint(i, viz.pitch_circle_center_distance);

        const new_group = document.createElementNS(SVGNS, "g");
        new_group.setAttribute("id", `pc${i}`);
        new_group.setAttribute("pc", i);
        new_group.setAttribute("x", p.x);
        new_group.setAttribute("y", p.y);
        new_group.setAttribute("onclick", `togglePcs([${i}])`);
        new_group.addEventListener("mousedown", pcMouseDown, { capture: true, passive: false });

        new_group.classList.add("pc");
        if ( [0,2,4,5,7,9,11].includes(i) ) {
            new_group.classList.add("white-key");
        } else {
            new_group.classList.add("black-key");
        }

        const new_circle = document.createElementNS(SVGNS, "circle");
        new_circle.setAttribute("pc", i);
        new_circle.setAttribute("cx", p.x);
        new_circle.setAttribute("cy", p.y);
        new_circle.setAttribute("r", viz.pitch_circle_radius);

        const new_text_number = document.createElementNS(SVGNS, "text");
        new_text_number.setAttribute("pc", i);
        new_text_number.innerHTML = i.toString();
        new_text_number.setAttribute("x", p.x);
        new_text_number.setAttribute("y", p.y);
        new_text_number.classList.add("pc-text-number");

        const new_text_note = document.createElementNS(SVGNS, "text");
        new_text_note.setAttribute("pc", i);
        new_text_note.setAttribute("x", p.x);
        new_text_note.setAttribute("y", p.y);
        new_text_note.classList.add("pc-text-note");
        if ( [0,2,4,5,7,9,11].includes(i) ) {
            new_text_note.innerHTML = ["C",,"D",,"E","F",,"G",,"A",,"B"][i];
        } else {
            const sharp_note = document.createElementNS(SVGNS, "tspan");
            sharp_note.setAttribute("pc", i);
            sharp_note.setAttribute("x", p.x);
            sharp_note.setAttribute("y", p.y-11);
            sharp_note.classList.add("pc-text-note-sharp");
            sharp_note.innerHTML = [,"C♯",,"D♯",,,"F♯",,"G♯",,"A♯"][i];
            new_text_note.appendChild(sharp_note);
            const flat_note = document.createElementNS(SVGNS, "tspan");
            flat_note.setAttribute("pc", i);
            flat_note.setAttribute("x", p.x);
            flat_note.setAttribute("y", p.y+9);
            flat_note.classList.add("pc-text-note-flat");
            flat_note.innerHTML = [,"D♭",,"E♭",,,"G♭",,"A♭",,"B♭"][i];
            new_text_note.appendChild(flat_note);
        }

        new_group.appendChild(new_circle);
        new_group.appendChild(new_text_number);
        new_group.appendChild(new_text_note);
        viz.svg_main.appendChild(new_group);
        viz.pitches[i] = new_group;

    }

    viz.move_line = document.createElementNS(SVGNS, "path");
    viz.move_line.setAttribute("id", "move-line");
    viz.svg_main.appendChild(viz.move_line);
    
}


function pcMouseDown(evt) {
    const pc = parseInt(evt.target.getAttribute("pc"));
    if (viz.pitches[pc].classList.contains("selected")) {
        viz.svg_root.style.setProperty("cursor", "move", "important");
        //pc_circle.notes[pc].style.cursor = "move";
        //pc_circle.notes[pc].setPointerCapture(evt.pointerId);
        viz.pitches[pc].classList.add("pc-moving-from");
        pc_drag_state.active = true;
        pc_drag_state.from = pc;
        pc_drag_state.to = pc;
        document.addEventListener("mouseup", pcMouseUp, { capture: true, passive: false });
        for ( let i = 0; i < 12; i++ ) {
            viz.pitches[i].addEventListener("mousemove", pcMouseEnter, { capture: true, passive: false });
            viz.pitches[i].addEventListener("mouseleave", pcMouseLeave, { capture: true, passive: false });
        }
    }
}


function pcMouseUp(evt) {
    //pc_circle.notes[pc_drag_state.to].style.cursor = "pointer";
    viz.svg_root.style.removeProperty("cursor");
    //pc_circle.notes[pc].releasePointerCapture(evt.pointerId);
    if ( pc_drag_state.from != null && pc_drag_state.to != null )
        togglePcs([pc_drag_state.from, pc_drag_state.to]);
    if ( pc_drag_state.from != null ) {
        viz.pitches[pc_drag_state.from].classList.remove("pc-moving-from");
        pc_drag_state.from = null;
    }
    if ( pc_drag_state.to != null ) {
        viz.pitches[pc_drag_state.to].classList.remove("pc-moving-to");
        pc_drag_state.to = null;
    }
    pc_drag_state.active = false;
    viz.move_line.setAttribute("d", "");
    document.removeEventListener("mouseup", pcMouseUp);
    for ( let i = 0; i < 12; i++ ) {
        viz.pitches[i].removeEventListener("mousemove", pcMouseEnter);
    }
}


function pcMouseEnter(evt) {
    const pc = parseInt(evt.target.getAttribute("pc"));
    if ( pc_drag_state.active ) {
        if ( pc_drag_state.from != pc 
          && pc_drag_state.to != pc
          && !viz.pitches[pc].classList.contains("selected")
        ) {
            viz.pitches[pc].classList.add("pc-moving-to");
            viz.pitches[pc_drag_state.to].classList.remove("pc-moving-to");
            pc_drag_state.to = pc;
        } else if ( pc_drag_state.from == pc ) {
            viz.pitches[pc_drag_state.to].classList.remove("pc-moving-to");
            pc_drag_state.to = pc;
        }
        if ( pc_drag_state.to != pc_drag_state.from ) {
            const p1 = vizGetPoint(pc_drag_state.from, viz.pitch_circle_border_distance);
            const p2 = vizGetPoint(pc_drag_state.to, viz.pitch_circle_border_distance);
            viz.move_line.setAttribute("d", `M ${p1.x} ${p1.y} Q ${viz.viewport.cx} ${viz.viewport.cy} ${p2.x} ${p2.y}`);
        } else {
            viz.move_line.setAttribute("d", "");
        }
    }
}


function pcMouseLeave(evt) {
    const pc = parseInt(evt.target.getAttribute("pc"));
    if ( pc_drag_state.active ) {
        if ( pc_drag_state.to == pc ) {
            viz.pitches[pc_drag_state.to].classList.remove("pc-moving-to");
            pc_drag_state.to = pc_drag_state.from;
        }
        viz.move_line.setAttribute("d", "");
    }
}


function drawVisualization(options = {}) {

    for ( const elm of document.getElementsByClassName("pc-text-number") )
        elm.style.visibility = config.note_names ? "hidden" : "visible";
    for ( const elm of document.getElementsByClassName("pc-text-note") )
        elm.style.visibility = config.note_names ? "visible" : "hidden";

    for (let i = 0; i < 12; i++) {
        if (state.pcset.has(i))
            viz.pitches[i].classList.add("selected");
        else
            viz.pitches[i].classList.remove("selected");
    }

    viz.polygon.style.display = (config.polygon) ? "inline" : "none";

    
    if ( polygon_update_timer ) clearTimeout(polygon_update_timer);
    polygon_update_timer = setTimeout(() => {
            if ( !options.keep_polygon ) drawPolygon();
            drawSymmetryLines();
            polygon_update_timer = null;
        }, options.polygon_delay ?? 0
    );
    
}


function drawPolygon() {

    if ( state.pcset.size == 0 ) {
        state.polygon = [];
        viz.polygon.setAttribute("d", "");
        return;
    }

    function nearest_index(pc, array) {
        let index = 0;
        let ic = computeIntervalClass(pc, array[0]);
        for ( let i = 1; i < array.length; i++ ) {
            const new_ic = computeIntervalClass(pc, array[i]);
            if ( new_ic < ic ) {
                index = i;
                ic = new_ic;
            }
        }
        return index;
    }

    const normal_array = state.pcset.normal.toArray();

    // Compute points based on operation type
    if ( state.pcset.size != state.polygon.length ) {
        // No animation
        state.polygon = normal_array;
    } else switch ( state.last_op ? state.last_op[0] : null ) {
        // Compute best transition between points
        case "T":
        case "Tn":
            const tr = (state.last_op[1] <= 6) 
                ? state.last_op[1] 
                : state.last_op[1]-12;
            state.polygon = state.polygon.map((x) => mod12(x+tr));
            break;
        case "I":
        case "In":
        case "TnI":
            const ix = state.last_op[1];
            state.polygon = state.polygon.map((x) => mod12(ix-x));
            break;
        default:
            const size = normal_array.length;
            let new_pcset = Array.from(normal_array);
            let new_polygon = Array(size).fill(null);
            // Keep same pcs
            for ( let i = 0; i < size; i++ ) {
                const pc = state.polygon[i];
                const found = new_pcset.indexOf(pc);
                if ( found != -1 ) {
                    new_polygon[i] = pc;
                    new_pcset.splice(found, 1);
                }
            }
            // Move different pcs
            for ( let i = 0; i < size; i++ ) {
                if ( new_polygon[i] == null ) {
                    const pc = state.polygon[i];
                    const next = nearest_index(pc, new_pcset);
                    new_polygon[i] = new_pcset[next];
                    new_pcset.splice(next, 1);
                }
            }
            state.polygon = new_polygon;
    }

    // Correct polygon if necessary
    if ( arraysSameElements(normal_array, state.polygon) ) {
        if ( state.last_op == null ) {
            let direction_aggregate = 0;
            let previous = state.polygon[0];
            for ( let n of state.polygon ) {
                direction_aggregate += Math.sign(n-previous);
                previous = n;
            }
            if ( direction_aggregate >= 0 ) {
                const first = state.polygon[0];
                state.polygon.sort((a,b) => mod12(a-first)-mod12(b-first));
            } else {
                const last = state.polygon[state.polygon.length-1];
                state.polygon.sort((a,b) => mod12(a-last)-mod12(b-last));
                state.polygon.reverse();
            }
        }
    } else {
        //console.log(`Error detected in polygon: normal is [${normal_array.toString()}], polygon is [${state.polygon.toString()}]`);
        state.polygon = Array.from(normal_array);
    }

    let points = [];
    for ( let pc of state.polygon) {
        const p = vizGetPoint(pc, viz.pitch_circle_border_distance);
        points.push({x: p.x, y: p.y});
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for ( let i = 1; i < points.length; i++ )
        d += `L ${points[i].x} ${points[i].y}`;
    d += " Z";
    viz.polygon.setAttribute("d", d);

}


function drawIntervals(intervals = [1,2,3,4,5,6]) {

    const SVGNS = "http://www.w3.org/2000/svg";

    while (viz.intervals_group.firstChild)
        viz.intervals_group.removeChild(viz.intervals_group.lastChild);

    if ( (!config.intervals) || (state.pcset.size < 2) )
        return;

    for ( let i = 0; i < state.pcset.size-1; i++ ) {
        const pc1 = state.pcset.at(i);
        for ( let j = i+1; j < state.pcset.size; j++ ) {
            const pc2 = state.pcset.at(j);
            if ( intervals.includes(computeIntervalClass(pc1,pc2)) ) {
                let interval_line = document.createElementNS(SVGNS, "path");
                interval_line.classList.add("interval-line"); 
                const pi = vizGetPoint(pc1, viz.pitch_circle_border_distance);
                const pj = vizGetPoint(pc2, viz.pitch_circle_border_distance);
                interval_line.setAttribute("d", `M ${pi.x} ${pi.y} L ${pj.x} ${pj.y}`);
                viz.intervals_group.appendChild(interval_line);
            }
        }
    }

}


function drawSymmetryLines() {

    while (viz.sym_lines_group.firstChild)
        viz.sym_lines_group.removeChild(viz.sym_lines_group.lastChild);

    if ( (!config.symmetry_axes) || (state.pcset.size == 0) )
        return;

    for ( const axis of state.axes ) {
        let axis_line = document.createElementNS(SVGNS, "path");
        axis_line.classList.add("symmetry-axis");
        const pa = vizGetPoint(axis.a, viz.pitch_circle_center_distance);
        const pb = vizGetPoint(axis.b, viz.pitch_circle_center_distance);
        axis_line.setAttribute("d", `M ${pa.x} ${pa.y} L ${pb.x} ${pb.y}`);
        viz.sym_lines_group.appendChild(axis_line);
    }

}


function vizGetPoint(pc, from_center) {
    const angle = degToRad(((pc * ( config.fifths ? 210 : 30 )) - 90) % 360);
    return { x: Math.cos(angle) * from_center + viz.viewport.cx, 
             y: Math.sin(angle) * from_center + viz.viewport.cy };
}
