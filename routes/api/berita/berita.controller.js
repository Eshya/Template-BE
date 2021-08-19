const { default: axios } = require("axios");

exports.findCategories = async (req, res, next) => {
    try {
        const getCategories = await axios.get('https://chickin.id/blog/wp-json/wp/v2/categories')
        res.json({
            data: getCategories.data
        })
    } catch (error) {
        next(error);
    }
}

exports.findPosts = async (req, res, next) => {
    try {
        const getPost = await axios.get('https://chickin.id/blog/wp-json/wp/v2/posts')
        res.json({
            data: getPost.data
        })
    } catch (error) {
        next(error)
    }
}

exports.postBycategories = async (req, res, next) => {
    try {
        const get = await axios.get('https://chickin.id/blog/wp-json/wp/v2/posts?categories=14');
        res.json({
            data: get.data
        })
    } catch (error) {
        next(error)
    }
}

exports.postById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const get = await axios.get('https://chickin.id/blog/wp-json/wp/v2/posts/' + id)
        res.json({
            data: get.data,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}
