import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({});
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// Create new product
router.post('/', async (req, res) => {
    try {
        // Find the maximum ID currently in the DB
        const maxProduct = await Product.findOne().sort({ id: -1 });
        const newId = maxProduct ? maxProduct.id + 1 : 1;

        const productData = {
            ...req.body,
            id: newId
        };

        const newProduct = new Product(productData);
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// Update single product status
router.put('/:id/status', async (req, res) => {
    try {
        const { isOutOfStock, isNew } = req.body;
        const updateData = {};
        if (isOutOfStock !== undefined) updateData.isOutOfStock = isOutOfStock;
        if (isNew !== undefined) updateData.isNew = isNew;

        const product = await Product.findOneAndUpdate(
            { id: req.params.id },
            { $set: updateData },
            { new: true }
        );

        if (product) {
            res.status(200).json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// Bulk update products status
router.put('/bulk-status', async (req, res) => {
    try {
        const { productIds, isOutOfStock, isNew } = req.body;
        
        if (!productIds || !Array.isArray(productIds)) {
            return res.status(400).json({ message: 'productIds array is required' });
        }

        const updateData = {};
        if (isOutOfStock !== undefined) updateData.isOutOfStock = isOutOfStock;
        if (isNew !== undefined) updateData.isNew = isNew;

        const result = await Product.updateMany(
            { id: { $in: productIds } },
            { $set: updateData }
        );

        res.status(200).json({ 
            message: 'Products updated successfully', 
            modifiedCount: result.modifiedCount 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// Update product details (e.g. price, mrp, variants)
router.put('/:id', async (req, res) => {
    try {
        const allowed = ['price', 'oldPrice', 'name', 'category', 'subCategory', 'isNew', 
                         'isOutOfStock', 'qualities', 'longDesc', 'features', 'material',
                         'relatedIds', 'variants', 'showcaseImages', 'imgSrc', 'hoverImgSrc', 'stock'];
        
        const updateData = {};
        allowed.forEach(key => {
            if (req.body[key] !== undefined) updateData[key] = req.body[key];
        });
        if (updateData.price !== undefined) updateData.price = Number(updateData.price);
        if (updateData.oldPrice !== undefined) updateData.oldPrice = Number(updateData.oldPrice);
        if (updateData.stock !== undefined) {
            updateData.stock = Number(updateData.stock);
            if (updateData.stock > 0) {
                updateData.isOutOfStock = false;
            } else {
                updateData.isOutOfStock = true;
            }
        }

        const product = await Product.findOneAndUpdate(
            { id: req.params.id },
            { $set: updateData },
            { new: true }
        );

        if (product) {
            res.status(200).json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

export default router;
