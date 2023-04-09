import "./main.css"
import * as THREE from "three"
import * as turf from "@turf/turf"
import { LoopSubdivision } from "three-subdivide"
import { Pane } from "tweakpane"
import GeoJSONValidator from "geojson-validation"
import * as utils from "./utils"
import basicSetup from "./setup"
import { Earcut } from "./Earcut"

window.addEventListener( "DOMContentLoaded", () => {

	document.fonts.ready.then( () => init() )

	document.body.style.opacity = 1
} )

const params = {
	loop: 1,
	split: true,
	smooth: true,
	edge: true,
	flat: true,
	triangles: 100,
	infiniteTriangles: false,
	material: 1,
	wireframe: false,
	uvcheck: false,
	mapRepeatX: 1,
	mapRepeatY: 1,
}

const world = new THREE.Object3D()

function init() {

	const fileInput = document.getElementById( "fileInput" )
	const openFileButton = document.getElementById( "openFileButton" )

	fileInput.addEventListener( "change", e => {

		if ( e.target.files && e.target.files[ 0 ] ) {

			const source = e.target.files[ 0 ]

			const reader = new FileReader()

			reader.addEventListener( "load", e => {

				let data = null

				try {

					data = JSON.parse( e.target.result )

				}
				catch( e ) {

					alert( "Invalid file" )
				}
				finally {

					if ( GeoJSONValidator.isGeoJSONObject( data ) ) {

						openFileButton.remove()
						run( data )
					}
					else {
						alert( "Invalid GeoJSON" )
					}
				}
			} )

			reader.readAsBinaryString( source )
		}
	} )

	openFileButton.onclick = () => fileInput.click()
}

function run( data ) {

	const { scene } = basicSetup()

	scene.add( new THREE.AxesHelper( 10_000 ) )

	scene.add( new THREE.DirectionalLight( 0xffffff, 0.5 ) )
	scene.add( new THREE.HemisphereLight( 0xffffff, 0xaaaaaa, 0.5 ) )

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
			MeshStandardMaterial: 2,
		},
	} )
	pane.addInput( params, "wireframe" )
	pane.addInput( params, "uvcheck" )
	pane.addInput( params, "mapRepeatX", {
		min: 1,
		max: 100,
		step: 1,
	} )
	pane.addInput( params, "mapRepeatY", {
		min: 1,
		max: 100,
		step: 1,
	} )

	const gen = () => {

		world.children = []
		scene.remove( world )

		generate( scene, data )
	}

	gen()

	pane.on( "change", gen )
}

function generate( scene, data ) {

	let material = null

	const map = params.uvcheck ? new THREE.TextureLoader().load( "/uvcheck.jpg" ) : null

	if ( map ) {

		map.wrapS = map.wrapT = THREE.RepeatWrapping
		map.repeat.set( params.mapRepeatX, params.mapRepeatY )
	}

	if ( params.material === 1 ) {

		material = new THREE.MeshBasicMaterial( { map, wireframe: params.wireframe, side: THREE.DoubleSide } )
	}
	else if ( params.material === 2 ) {

		material = new THREE.MeshStandardMaterial( { map, wireframe: params.wireframe, side: THREE.DoubleSide } )
	}
	
	const points = []
	const pointsCollection = []

	turf.geomEach( data, ( { type, coordinates } ) => {

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

	turf.geomEach( data, ( { type, coordinates } ) => {

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

			{
				// UV calculation

				const box3 = new THREE.Box3().setFromObject( mesh )
				const size = new THREE.Vector3()
				box3.getSize( size )

				const position = mesh.geometry.attributes.position
				const uv = []

				const v3 = new THREE.Vector3()

				for ( let i = 0, count = position.count; i < count; i++ ) {

					v3.fromBufferAttribute( position, i )

					const x = ( v3.x - box3.min.x ) / size.x
					const y = ( v3.y - box3.min.y ) / size.y

					uv.push( x, y )
				}
				
				subdivided.computeVertexNormals()

				subdivided.setAttribute( "uv", new THREE.Float32BufferAttribute( uv, 2 ) )
				subdivided.needsUpdate = true
			}

			world.add( mesh )
		}
	} )

	scene.add( world )

	const center = new THREE.Vector3()
	new THREE.Box3().setFromObject( world ).getCenter( center )
	world.position.sub( center )
}
