/*
SVG Tools Javascript library
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

const SvgTools = {

    /**
     * @param {String} type 
     * @param {Object} attributes 
     * @returns {SVGElement}
     */
    createElement(type, attributes = {}) {
        const elm = document.createElementNS(SVGNS, type);
        for ( const [attr, value] of Object.entries(attributes) )
            elm.setAttribute(attr, value);
        return elm;
    },

    /**
     * Creates a SVG root element.
     * @param {Object} attributes 
     * @returns {SVGSVGElement}
     */
    createRootElement(attributes = {}) {
        const svg = document.createElementNS(SVGNS, "svg")
        svg.setAttribute("version", "1.1");
        svg.setAttribute("xmlns", SVGNS);
        for ( const [attr, value] of Object.entries(attributes) )
            svg.setAttribute(attr, value);
        return svg;
    },

    createGroup(attributes = {}) {
        return this.createElement("g", attributes);
    },

    makeLine(x1, y1, x2, y2, attributes) {
        const line = this.createElement("line", attributes);
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        return line;
    },
    
    makePolygon(points, attributes = {}) {
        const count = points.length;
        const polygon = this.createElement("path", attributes);
        let d = ['M', points[0].x, points[0].y];
        if ( count > 1 ) {
            for ( let i = 1; i < count; i++ )
                d.push('L', points[i].x, points[i].y);
            if ( count > 2 ) d.push('Z');
            polygon.setAttribute("d", d.join(' '));
        }
        return polygon;
    },
    
    makePath(d, attributes = {}, x = null, y = null) {
        const path = this.createElement("path", attributes);
        path.setAttribute("d", ( Array.isArray(d) ? d.join(" ") : d ));
        if ( x != null ) path.setAttribute("x", x.toString());
        if ( y != null ) path.setAttribute("y", y.toString());
        return path;
    },
    
    makeSimpleArrowMarker(id, size, attributes = {}) {
        const path = this.makePath(
            ['M', 0, 0, 'L', 10, 5, 'L', 0, 10, 'Z'], attributes
        );
        const marker = this.createElement("marker", {
            "id": id,
            "viewbox": [-5,-5,15,15].join(' '),
            "refX": 5,
            "refY": 5,
            "markerWidth": size,
            "markerHeight": size,
            "orient": "auto-start-reverse"
        });
        marker.appendChild(path);
        return marker;
    }

}
