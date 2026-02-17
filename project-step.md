# PartShop Implementation Plan

This document provides a detailed step-by-step guide to building the PartShop application as specified in the `project_idea_prd.txt`.

## Phase 1: Project Setup & Core Dependencies

1.  **Initialize Expo Project:**
    *   Create a new React Native project using Expo:
        ```bash
        npx create-expo-app PartShop --template
        ```
    *   Navigate into the project directory:
        ```bash
        cd PartShop
        ```

2.  **Install Dependencies:**
    *   Install all necessary libraries for database, navigation, and file system access.
        ```bash
        npx expo install expo-sqlite expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-document-picker expo-file-system expo-intent-launcher expo-sharing
        ```

3.  **Configure Expo Router:**
    *   In `app.json`, add the `scheme` property for deep linking:
        ```json
        {
          "expo": {
            "scheme": "partshop"
          }
        }
        ```
    *   Ensure your `package.json`'s `main` entry points to `expo-router/entry`.

## Phase 2: Database Layer

1.  **Database Initialization Script:**
    *   Create a directory `lib` and a file inside it named `database.js`.
    *   This file will handle the database connection and initial schema setup.
    *   **Goal:** Write functions to create the `categories`, `items`, and `shopping_list` tables if they don't exist and to insert the default 'Uncategorized' category.

    ```javascript
    // lib/database.js
    import * as SQLite from 'expo-sqlite';

    const db = SQLite.openDatabase('partshop.db');

    export const initDB = () => {
      const promise = new Promise((resolve, reject) => {
        db.transaction(tx => {
          // Create Categories Table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS categories (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL UNIQUE
            );`,
            [],
            () => {},
            (_, err) => reject(err)
          );
          // Create Items Table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              category_id INTEGER NOT NULL,
              name TEXT NOT NULL,
              quantity INTEGER DEFAULT 0,
              datasheet_uri TEXT,
              FOREIGN KEY (category_id) REFERENCES categories (id)
            );`,
            [],
            () => {},
            (_, err) => reject(err)
          );
          // Create Shopping List Table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS shopping_list (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              target_category_id INTEGER,
              name TEXT NOT NULL,
              target_quantity INTEGER DEFAULT 1,
              is_purchased BOOLEAN DEFAULT 0,
              FOREIGN KEY (target_category_id) REFERENCES categories (id)
            );`,
            [],
            () => {},
            (_, err) => reject(err)
          );
          // Seed "Uncategorized" Category
          tx.executeSql(
            "INSERT OR IGNORE INTO categories (id, name) VALUES (1, 'Uncategorized');",
            [],
            () => resolve(),
            (_, err) => reject(err)
          );
        });
      });
      return promise;
    };
    ```

2.  **Encapsulate Logic with Custom Hooks:**
    *   Create a directory `hooks`.
    *   For each table, create a corresponding hook to manage all database operations (CRUD - Create, Read, Update, Delete). This keeps SQL out of your UI components.
    *   **Example for `useCategories.js`:**
        ```javascript
        // hooks/useCategories.js
        // ... (import db)
        // export function useCategories() {
        //   const addCategory = (name) => { /* ... SQL INSERT ... */ };
        //   const getCategories = () => { /* ... SQL SELECT ... */ };
        //   const deleteCategory = (id) => { /* ... SQL UPDATE items, then DELETE category ... */ };
        //   return { addCategory, getCategories, deleteCategory };
        // }
        ```
    *   Create similar hooks for `useItems.js` and `useShoppingList.js`.

## Phase 3: UI Layout & Navigation

1.  **App Entry Point & DB Initialization:**
    *   In your root `app/_layout.jsx`, initialize the database. Use a `useEffect` and state to show a loading indicator while the DB sets up.

2.  **Tab Navigator:**
    *   Create a `(tabs)` directory inside `app`.
    *   Create a `_layout.jsx` inside `app/(tabs)` to define the tab navigator.
    *   **Tabs:**
        *   **Inventory:** Links to `app/(tabs)/inventory/index.jsx`.
        *   **Shopping List:** Links to `app/(tabs)/shopping.jsx`.

3.  **Stack Navigator for Inventory:**
    *   The inventory section will have multiple screens. Expo Router handles this with nested layouts.
    *   `app/(tabs)/inventory/_layout.jsx`: Defines the stack navigator for the inventory section.
    *   `app/(tabs)/inventory/index.jsx`: The main inventory screen. It will list all categories.
    *   `app/(tabs)/inventory/[categoryId].jsx`: A dynamic route that displays all items within a specific category.
    *   `app/(tabs)/item/[itemId].jsx`: (Optional) A screen to view/edit item details.

## Phase 4: Feature Implementation

1.  **Inventory Management:**
    *   **Category List (`inventory/index.jsx`):**
        *   Use the `useCategories` hook to fetch and display categories in a `FlatList`.
        *   Implement "Add Category" functionality using a `Modal`.
        *   Implement "Safe Delete" on categories, showing a confirmation alert and a toast message on success.
    *   **Item List (`inventory/[categoryId].jsx`):**
        *   Use the `useItems` hook to fetch items for the given category ID from the route.
        *   Display items in a `FlatList`.
        *   Add a search bar that filters the list using the `searchItems` function from your hook.
        *   Implement "Add/Edit Item" functionality using a `Modal`.

2.  **Shopping List Workflow (`shopping.jsx`):**
    *   Use the `useShoppingList` hook to manage the list.
    *   Display items with a "Mark as Purchased" button.
    *   When "Purchased" is clicked:
        1.  Call the `purchaseShoppingItem` function from your hook.
        2.  This function will `INSERT` the item into the `items` table and `DELETE` it from the `shopping_list` table.
        3.  Show a toast message confirming the action.

3.  **Datasheet Management:**
    *   In the "Add/Edit Item" modal:
        *   Add a "Select Datasheet" button.
        *   On press, call `DocumentPicker.getDocumentAsync({ type: 'application/pdf' })`.
        *   If a file is picked:
            1.  Define a new URI in the app's persistent directory: `FileSystem.documentDirectory + 'datasheets/'`.
            2.  Ensure this directory exists with `FileSystem.makeDirectoryAsync`.
            3.  Copy the picked file to the new URI using `FileSystem.copyAsync`.
            4.  Save the *new* URI to the item's `datasheet_uri` field in the database.
    *   **Viewing:**
        *   On the item details screen/component, add a "View Datasheet" button.
        *   On press, use `IntentLauncher.startActivityAsync` (Android) or `Sharing.shareAsync` (iOS) to open the file URI.

4.  **Theming (Dark/Light Mode):**
    *   Create a `ThemeContext` using React's Context API.
    *   Create a `ThemeProvider` component that wraps your entire app.
    *   Inside the provider, use the `useColorScheme` hook from React Native to detect the system theme.
    *   Define color palettes for `dark` and `light` themes.
    *   Provide the active color palette through the context.
    *   In your components, consume the context to apply colors dynamically (e.g., `style={{backgroundColor: theme.colors.background}}`).

## Phase 5: Polishing

1.  **Empty List Components:**
    *   For every `FlatList`, provide a `ListEmptyComponent` prop to render a user-friendly message like "No items yet" or "Your shopping list is empty."

2.  **User Feedback:**
    *   Implement a simple, cross-platform Toast component or use a library to provide feedback for actions (e.g., "Category deleted," "Item moved to inventory").

3.  **Input Validation:**
    *   In your modals, ensure that required fields (like `name`) are not empty before submitting the form.

4.  **Styling:**
    *   Refine the overall look and feel of the application to ensure a clean and intuitive user experience.
