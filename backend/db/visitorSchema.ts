import mongoose from "mongoose";

const visitor = new mongoose.Schema({
    access: {required: true, type: Boolean},
    code: {required: true, type: Object},
    driving: {required: true, type: Boolean},
    expiry: {required: true, type: Date},
    invitee: {required: true, type: Object},
    user: {required: true, type: Object},
    validity: {required:true, type: Boolean},
    vehicle: {required: false, type: Object},
})

const visitorShema = mongoose.model("Visitor", visitor);

export default visitorShema;