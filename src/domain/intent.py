from typing import Literal


# Classification agent status lifecycle
ClassificationStatus = Literal[
    "pending",
    "fetching_images",
    "analyzing",
    "updating",
    "completed",
    "failed"
]

# Same vehicle detection agent status lifecycle
SameVehicleStatus = Literal[
    "pending",
    "fetching_vehicle_images",
    "analyzing",
    "completed",
    "failed"
]

# Vehicle type agent status lifecycle
VehicleTypeStatus = Literal[
    "pending",
    "fetching_vehicle_images",
    "analyzing",
    "completed",
    "failed"
]

VehicleTypeCategory = Literal["PC", "MC", "CT", "EV", "CV", "SV", "OV", "UNKNOWN"]

# Damage detection agent status lifecycle
DamageDetectionStatus = Literal[
    "pending",
    "fetching_vehicle_images",
    "analyzing",
    "completed",
    "failed"
]

# Image pipeline summary agent status lifecycle
ImagePipelineSummaryStatus = Literal[
    "pending",
    "fetching_results",
    "aggregating",
    "completed",
    "failed"
]

# Liability assessment agent status lifecycle
LiabilityStatus = Literal[
    "pending",
    "fetching_data",
    "analyzing",
    "completed",
    "failed"
]
