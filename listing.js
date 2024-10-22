// const { required } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");


const listingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true }, // Ensure price is a number and is required
    location: { type: String, required: true },
    country: { type: String, required: true },
    reviews: [{
        type: Schema.Types.ObjectId,
        ref:"Review", required:true
},
],
});

listingSchema.post("findOneAndDelete",async ( listing) => {
    if (listing) {
        await Review.deleteMany({ _id: { $in: listing.reviews }});
    }
});

const Listing = mongoose.model("Listing",listingSchema);
module.exports = Listing;