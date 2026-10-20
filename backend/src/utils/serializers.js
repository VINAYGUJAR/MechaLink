function geoJsonPoint(longitude, latitude) {
  if (longitude === null || longitude === undefined ||
      latitude === null || latitude === undefined) {
    return undefined;
  }

  return {
    type: "Point",
    coordinates: [longitude, latitude],
  };
}

function serializeUser(user) {
  const serialized = {
    _id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
  };

  if (user.role !== undefined) {
    serialized.role = user.role;
  }

  return serialized;
}

function serializeMechanic(mechanic) {
  const serialized = {
    _id: mechanic.id,
    garageName: mechanic.garageName,
    description: mechanic.description,
    garageAddress: mechanic.garageAddress,
    services: mechanic.services,
    verificationStatus: mechanic.verificationStatus,
    createdAt: mechanic.createdAt,
    updatedAt: mechanic.updatedAt,
  };

  if (mechanic.user !== undefined) {
    serialized.user = mechanic.user
      ? serializeUser(mechanic.user)
      : null;
  } else {
    serialized.user = mechanic.userId;
  }

  const location = geoJsonPoint(mechanic.longitude, mechanic.latitude);
  if (location) {
    serialized.location = location;
  }

  return serialized;
}

function serializeNearbyMechanic(mechanic) {
  return {
    _id: mechanic.id,
    garageName: mechanic.garageName,
    description: mechanic.description,
    garageAddress: mechanic.garageAddress,
    services: mechanic.services,
    location: geoJsonPoint(mechanic.longitude, mechanic.latitude),
  };
}

function serializeVehicle(vehicle) {
  return {
    _id: vehicle.id,
    owner: vehicle.ownerId,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    registrationNumber: vehicle.registrationNumber,
    vehicleType: vehicle.vehicleType,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
  };
}

function serializeEmergencyRequest(request) {
  const serialized = {
    _id: request.id,
    breakdownAddress: request.breakdownAddress,
    breakdownLocation: geoJsonPoint(
      request.breakdownLongitude,
      request.breakdownLatitude
    ),
    description: request.description,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    customer: request.customer
      ? serializeUser(request.customer)
      : request.customerId,
    vehicle: request.vehicle
      ? serializeVehicle(request.vehicle)
      : request.vehicleId,
    mechanic: request.mechanic
      ? serializeMechanic(request.mechanic)
      : request.mechanicId,
  };

  return serialized;
}

module.exports = {
  geoJsonPoint,
  serializeUser,
  serializeMechanic,
  serializeNearbyMechanic,
  serializeVehicle,
  serializeEmergencyRequest,
};
