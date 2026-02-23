import mongoose from "mongoose";

interface UnitDocument {
    complex?: Record<string, unknown>;
    gatedCommunity?: Record<string, unknown>;
    number: number;
    numberOfParkingBays: number;
    users: unknown[];
}

const unit = new mongoose.Schema<UnitDocument>({
    complex: { required: false, type: Object},
    gatedCommunity: { required: false, type: Object},
    number: { required: true, type: Number},
    numberOfParkingBays: {required: true, type: Number},
    users: {type: Array},
}, {
    toJSON: {
        transform: (_doc, ret) => {
            delete ret.numberOfRooms;
            delete ret.occupied;
            return ret;
        },
    },
    toObject: {
        transform: (_doc, ret) => {
            delete ret.numberOfRooms;
            delete ret.occupied;
            return ret;
        },
    },
});

const unitSchema = mongoose.model<UnitDocument>("Unit", unit);

export default unitSchema;