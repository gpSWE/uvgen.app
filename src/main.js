import "./main.css"
import * as THREE from "three"
import * as turf from "@turf/turf"
import { LoopSubdivision } from "three-subdivide"
import { Pane } from "tweakpane"
import * as utils from "./utils"
import basicSetup from "./setup"
import { Earcut } from "./Earcut"
import sample from "./sample-data"

window.addEventListener( "DOMContentLoaded", run )

const params = {
	loop: 1,
	split: true,
	smooth: true,
	edge: true,
	flat: true,
	triangles: 100,
	infiniteTriangles: false,
	material: 1,
	wireframe: true,
}

const world = new THREE.Object3D()

function run() {

	const { scene } = basicSetup()

	scene.add( new THREE.AxesHelper( 10_000 ) )

	// GUI

	const pane = new Pane()

	pane.addInput( params, "loop", {
		min: 1,
		max: 7,
		step: 1,
	} )
	pane.addInput( params, "split" )
	pane.addInput( params, "smooth" )
	pane.addInput( params, "edge" )
	pane.addInput( params, "flat" )
	pane.addInput( params, "infiniteTriangles" )
	pane.addInput( params, "triangles", {
		min: 500,
		max: 100_000,
		step: 500,
	} )
	const material = pane.addInput( params, "material", {
		options: {
			MeshBasicMaterial: 1,
			MeshNormalMaterial: 2,
		},
	} )
	pane.addInput( params, "wireframe" )

	pane.on( "change", ( { presetKey: param, value } ) => {

		world.children = []
		scene.remove( world )

		generate( scene )
	} )
}

function generate( scene ) {

	let material = null

	if ( params.material === 1 ) {

		material = new THREE.MeshBasicMaterial( { wireframe: params.wireframe, side: THREE.DoubleSide } )
	}
	else if ( params.material === 2 ) {

		material = new THREE.MeshNormalMaterial( { wireframe: params.wireframe, side: THREE.DoubleSide } )
	}
	
	const points = []
	const pointsCollection = []

	turf.geomEach( sample, ( { type, coordinates } ) => {

		if ( type === "Polygon" ) {

			for ( const coords of coordinates ) {

				for ( const point of coords ) {

					pointsCollection.push( turf.point( point ) )
				}
			}
		}
	} )

	const concave = turf.concave( turf.featureCollection( pointsCollection ) )

	const centerOfMass = turf.centerOfMass( concave ).geometry.coordinates

	turf.geomEach( sample, ( { type, coordinates } ) => {

		if ( type === "Polygon" ) {

			const vertices = []

			for ( const coords of coordinates ) {

				for ( const [ lon, lat ] of coords ) {

					vertices.push( ...utils.fromLonLat( centerOfMass, lon, lat ) )
				}
			}

			// Triangulate

			const indices = Earcut.triangulate( vertices, [], 3 )

			const geometry = new THREE.BufferGeometry()

			geometry.setAttribute( "position", new THREE.Float32BufferAttribute( vertices, 3 ) )

			geometry.setIndex( indices )

			const subdivided = LoopSubdivision.modify( geometry, params.loop, {
				split: params.split,
				uvSmooth: params.smooth,
				preserveEdges: params.edge,
				flatOnly: params.flat,
				maxTriangles: params.infiniteTriangles ? Infinity : params.triangles,
			} )

			const mesh = new THREE.Mesh( subdivided, material )

			world.add( mesh )
		}
	} )

	scene.add( world )

	const center = new THREE.Vector3()
	new THREE.Box3().setFromObject( world ).getCenter( center )
	world.position.sub( center )
}
