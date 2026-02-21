# PartShop: Electronic Component Inventory

A mobile application designed for hobbyists and engineers to organize and track their electronic component inventory efficiently.

## Description
PartShop is a React Native application built with Expo that provides a centralized system for managing electronic parts. It allows users to categorize components, track stock levels, attach visual references (images), and store technical documentation (PDF datasheets) directly on their mobile device.

### Key Features
- **Global Search:** Quickly find items or categories across the entire inventory.
- **Categorization:** Organize components into custom categories with visual thumbnails.
- **Rich Item Details:** Track names, quantities, and persistent images for every part.
- **PDF Datasheet Support:** Attach and open technical datasheets directly within the app.
- **Shopping List:** Add items to a shopping list and move them to inventory with a single tap.
- **Offline Storage:** All data is persisted locally using SQLite for fast, reliable access.
- **Modern Design System:** A cohesive UI with consistent theming (color palettes, typography, spacing), smooth animations, and a clear visual hierarchy.

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- [Expo Go](https://expo.dev/client) app on your mobile device or an Android/iOS emulator.

### Setup Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/partshop.git
   cd partshop
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run the app:**
   - Scan the QR code with your camera (iOS) or Expo Go app (Android).
   - Alternatively, press `a` for Android emulator or `i` for iOS simulator.

## Usage

### Adding a Category
1. On the main Inventory screen, tap the **+** FAB (Floating Action Button).
2. Upload a category image and enter a name.
3. Tap **Add** to save.

### Managing Items
1. Tap into a category.
2. Use the **+** button to add a new item.
3. You can pick an image from your gallery and select a PDF datasheet from your device's file system.
4. Items can be edited or deleted by tapping the icons on their respective cards.

### Global Search
Use the search bar at the top of the main screen to find both categories and items instantly. Results are debounced for performance.

### Bulk Data Import/Export
You can efficiently manage your inventory by importing data from a CSV file or exporting your current list.
1. Navigate to the **Settings** tab.
2. Under **Data Management**, tap **Import from CSV** to upload a file.
   - The CSV should have headers: `category,name,quantity`.
   - Missing categories will be created automatically.
3. Tap **Export to CSV** to share or save your current inventory as a spreadsheet.

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## License
Distributed under the **MIT License**. See `LICENSE` for more information.
