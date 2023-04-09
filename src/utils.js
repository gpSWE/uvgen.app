function fromLonLat( centerOfMass, targetLon, targetLat, scale = 6_378_137 ) {

	return [
		( 0 - ( scale * ( centerOfMass[ 0 ] % 360 * ( Math.PI / 180 ) ) * 1 ) ) + scale * ( ( targetLon * ( Math.PI / 180 ) ) * 1 ),
		( 0 - ( 0 - scale * ( Math.log( Math.tan( ( ( Math.PI / 2 ) + ( centerOfMass[ 1 ] % 360 * ( Math.PI / 180 ) ) ) / 2 ) ) ) * - 1 ) ) - scale * ( ( Math.log( Math.tan( ( ( Math.PI / 2 ) + ( targetLat * ( Math.PI / 180 ) ) ) / 2 ) ) ) * - 1 ),
		0,
	]
}

export {
	fromLonLat,
}
