import * as THREE from "three"
import { MapControls } from "three/addons/controls/MapControls"

export default () => {

	const scene = new THREE.Scene()

	const camera = new THREE.PerspectiveCamera()

	camera.far = 100_000
	camera.up = new THREE.Vector3( 0, 0, 1 )
	camera.position.set( 0, 0, 2_000 )
	camera.lookAt( 0, 0, 0 )

	const renderer = new THREE.WebGLRenderer( {
		alpha: true,
		antialias: true,
	} )

	renderer.setPixelRatio( window.devicePixelRatio )

	document.body.insertBefore( renderer.domElement, document.body.firstElementChild )

	const onResize = () => {
		camera.aspect = window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix()
		renderer.setSize( window.innerWidth, window.innerHeight )
	}

	onResize()

	window.addEventListener( "resize", onResize, false )

	const mapControls = new MapControls( camera, renderer.domElement )

	// Render

	renderer.setAnimationLoop( () => renderer.render( scene, camera ) )

	return {
		scene,
		camera,
		renderer,
	}
} 
