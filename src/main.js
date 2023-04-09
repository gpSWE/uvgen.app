import "./main.css"
import * as THREE from "three"
import * as turf from "@turf/turf"
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

			geometry.computeVertexNormals()

			const material = new THREE.MeshBasicMaterial( { wireframe: true } )

			const mesh = new THREE.Mesh( geometry, material )

			world.add( mesh )
		}
	} )
}
