const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const Listings = require("./models/listing.js");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema } = require("./schema.js"); // Importing the Joi schema
const Review = require("./models/review.js");

// MongoDB connection
const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
  .then(() => console.log("Connected to DB"))
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect(MONGO_URL);
}

// MIDDLEWARE SETUP

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Serve static CSS file
app.get("/css/style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "public/css/style.css"));
});

// Validation middleware to validate listings using Joi schema
const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    res.locals.validationError = msg; // Store the error message in res.locals
    return res.redirect("/listings/error"); // Redirect to the error page
  } else {
    next(); // Proceed if validation is successful
  }
};

const validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    res.locals.validationError = msg; // Store the error message in res.locals
    return res.redirect("/listings/error"); // Redirect to the error page
  } else {
    next(); // Proceed if validation is successful
  }
};
// ROUTES

// Root route
app.get("/", (req, res) => {
  res.send("Hi, I am root");
});

// Index route: Display all listings
app.get(
  "/listings",
  wrapAsync(async (req, res) => {
    const allListings = await Listings.find({});
    res.render("listings/index", { allListings });
  })
);

// New route: Displays the form for creating a new listing
app.get("/listings/new", (req, res) => {
  res.render("listings/new");
});

// Show route: Displays a specific listing by ID
app.get(
  "/listings/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    
    const listing = await Listings.findById(id).populate("reviews");
    if (listing) {
      res.render("listings/show", { listing });
    } else {
      throw new ExpressError(404, "Listing not found");
    }
  
  })
);

// Error route: Displays the validation error message on a new page
app.get("/listings/error", (req, res) => {
  const validationError = res.locals.validationError; // Retrieve the error message from locals
  res.render("listings/error", { validationError });
});

// Create route: Handles form submission to add a new listing
app.post(
  "/listings",
  validateListing, // Apply validation middleware
  wrapAsync(async (req, res) => {
    try {
      const { title, description, image, price, country, location } = req.body;
      const newListing = new Listings({
        title,
        description,
        image,
        price,
        country,
        location,
      });

      await newListing.save(); // Save the new listing to the database
      res.redirect(`/listings/${newListing._id}`); // Redirect to the new listing's show page
    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(500).send("Error creating listing");
    }
  })
);


// Edit route: Displays the form for editing a listing
app.get(
  "/listings/:id/edit",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    try {
      const listing = await Listings.findById(id);
      if (listing) {
        res.render("listings/edit", { listing });
      } else {
        res.status(404).send("Listing not found");
      }
    } catch (error) {
      res.status(500).send("Error fetching listing for edit");
    }
  })
);

// Update route: Handles form submission to update a listing
app.put(
  "/listings/:id",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    try {
      await Listings.findByIdAndUpdate(id, { ...req.body }, { new: true, runValidators: true });
      res.redirect(`/listings/${id}`); // Fixed redirect path with proper template literal
    } catch (error) {
      res.status(500).send("Error updating listing");
    }
  })
);



//Reviews
//Post Review Route

app.post("/listings/:id/reviews", validateReview,async (req, res) => {
  try {
   
    const { id } = req.params;
    const trimmedId = id.trim();
    let listing = await Listings.findById(trimmedId); // Use the trimmed ID

    if (!listing) {
      return res.status(404).send("Listing not found");
    }
    let newReview = new Review(req.body.review);
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();

    res.redirect(`/listings/${listing._id}`);
  } 
  catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

//Delete Review Route

app.delete(
  "/listings/:id/reviews/:reviewId",
  wrapAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    await Listings.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/listings/${id}`);
  })
);


// Handle 404 errors for all unknown routes
app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

// Global error handler middleware
app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;
  res.status(statusCode).render("error", { err: { message, statusCode } });
});

// Start the server
app.listen(8080, () => {
  console.log("Server is listening on port 8080");
});