import "./main.css"
import * as THREE from "three"
import * as turf from "@turf/turf"
import { LoopSubdivision } from "three-subdivide"
import * as utils from "./utils"
import basicSetup from "./setup"
import { Earcut } from "./Earcut"
import sample from "./sample-data"

window.addEventListener( "DOMContentLoaded", run )

function run() {

	const { scene } = basicSetup()

	scene.add( new THREE.AxesHelper( 10_000 ) )

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

	const world = new THREE.Object3D()
	scene.add( world )

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

			const iterations = 2

			const params = {
				split: true,
				uvSmooth: true,
				preserveEdges: true,
				flatOnly: true,
				maxTriangles: Infinity,
			}

			const subdivided = LoopSubdivision.modify( geometry, iterations, params )

			const material = new THREE.MeshNormalMaterial( { wireframe: true } )

			const mesh = new THREE.Mesh( subdivided, material )

			world.add( mesh )
		}
	} )
}
