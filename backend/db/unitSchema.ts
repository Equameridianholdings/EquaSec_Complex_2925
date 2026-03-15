import mongoose from "mongoose";

const unit = new mongoose.Schema({
    complex: { required: false, type: Object},
    gatedCommunity: { required: false, type: Object},
    house: {default: false, required: false, type: Boolean},
    number: { required: true, type: Number},
    numberOfParkingBays: {required: true, type: Number},
    users: {required: true, type: Array}, 
}, {
    toJSON: {
        transform: (_doc, ret) => {
            const record = ret as Record<string, unknown>;
            delete record.numberOfRooms;
            delete record.occupied;
            return ret;
        },
    },
    toObject: {
        transform: (_doc, ret) => {
            const record = ret as Record<string, unknown>;
            delete record.numberOfRooms;
            delete record.occupied;
            return ret;
        },
    },
});

const unitSchema = mongoose.model("Unit", unit);

export default unitSchema;