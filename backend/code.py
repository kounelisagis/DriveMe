import math
import numpy as np
import operator
from scipy import interpolate
import requests
import json
from numpy import arccos, array, dot, pi, cross
from numpy.linalg import det, norm
from flask import Flask
from flask_cors import CORS
from flask import request
from flask import jsonify

app = Flask(__name__)
CORS(app)

class Point:
	def __init__(self, lat, lng):
		self.lat = lat
		self.lng = lng
	def to_string(self):
		return str(self.lat) + ',' + str(self.lng)
	def distance_line_segment(self, p1, p2):
		P = array([self.lat, self.lng])
		A = array([p1.lat, p1.lng])
		B = array([p2.lat, p2.lng])
		if all(A == P) or all(B == P):
			return 0.0
		if arccos(dot((P - A) / norm(P - A), (B - A) / norm(B - A))) > pi / 2:
			return norm(P - A)
		if arccos(dot((P - B) / norm(P - B), (A - B) / norm(A - B))) > pi / 2:
			return norm(P - B)
		return norm(cross(A-B, A-P))/norm(B-A)

def distance_between_points(point1, point2):
	distance = math.sqrt( ( (point1.lat-point2.lat)**2 ) + ( (point1.lng-point2.lng)**2 ) )
	return distance


def to_string_array(points):
	arr = []
	for point in points:
		arr.append(str(point.lat) + ',' + str(point.lng))
	return arr


class Route:
	def __init__(self, origin, destination, capacity = 5):
		self.capacity = capacity
		self.origin = origin
		self.destination = destination
		self.points = []

	def optimize_route(self):
		route_points = []
		for point in self.points:
			route_points.append({'point': point, 'distance': distance_between_points(point, self.destination)})
		newlist = sorted(route_points, key=lambda k: k['distance'], reverse=True)
		self.points = []
		for point in newlist:
			self.points.append(point['point'])





# Main function
@app.route('/', methods=['POST'])
def hello():
	data = request.get_json()
	destination = Point(data['destination']['lat'],data['destination']['lng'])

	routes = []
	for driver in data['drivers']:
		routes.append(Route(Point(driver['lat'],driver['lng']), destination))

	candidates = []
	for candidate in data['candidates']:
		candidates.append(Point(candidate['lat'],candidate['lng']))

	min = float("inf")
	i_r = None
	i_c = None
	while len(candidates) > 0:
		for index_route, route in enumerate(routes):
			if len(route.points) + 1 == route.capacity:
				continue
			points = route.points.copy()
			points.insert(0, route.origin)
			points.append(route.destination)
			for index_candidate, candidate in enumerate(candidates):
				for i in range(0, len(points)-1):
					distance = candidate.distance_line_segment(points[i], points[i+1])
					if distance < min:
						min = distance
						i_r = index_route
						i_c = index_candidate

		if min == float("inf"):
			break
		routes[i_r].points.append(candidates[i_c])
		routes[i_r].optimize_route()
		del candidates[i_c]
		min = float("inf")

	result = {}
	result['routes'] = []
	for route in routes:
		ps = []
		route.points.insert(0, route.origin)
		route.points.append(route.destination)

		for point in route.points:
			ps.append({'lat': point.lat, 'lng': point.lng})
		result['routes'].append(ps)
	return jsonify(result)


if __name__ == "__main__":
    app.run()
