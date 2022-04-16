const { default: axios } = require("axios");

exports.findCategories = async (req, res, next) => {
    try {
        const getCategories = await axios.get('https://chickin.id/blog/index.php/wp-json/wp/v2/categories')
        res.json({
            data: getCategories.data
        })
    } catch (error) {
        next(error);
    }
}

exports.findPosts = async (req, res, next) => {
    try {
        const get = await axios.get('https://chickin.id/blog/index.php/wp-json/wp/v2/posts', )
        var asyncMap = await Promise.all(get.data.map(async(x) => {
            const getImage = await axios.get(`https://chickin.id/blog/index.php/wp-json/wp/v2/media/`+ x.featured_media, {validateStatus: function (status) {return status < 500}})
            const obj = {
                id: x.id,
                date: x.modified,
                title: x.title.rendered,
                content: x.content.rendered,
                embed: getImage.data.media_details
            }
            return obj
        }))
        res.json({
            data: asyncMap,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.postBycategories = async (req, res, next) => {
    try {
        const get = await axios.get('https://chickin.id/blog/index.php/wp-json/wp/v2/posts?categories=14');

        var asyncMap = await Promise.all(get.data.map(async(x) => {
            if(x.featured_media === 2749) return;
                const getImage = await axios.get(`https://chickin.id/blog/index.php/wp-json/wp/v2/media/`+ x.featured_media)
                const obj = {
                    id: x.id,
                    date: x.modified,
                    title: x.title.rendered,
                    content: x.content.rendered,
                    embed: getImage.data.media_details.sizes.medium, 
                }
                return obj
        }))
        res.json({
            data: asyncMap,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.postById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const get = await axios.get('https://chickin.id/blog/index.php/wp-json/wp/v2/posts/' + id)
        const getImage = await axios.get(`https://chickin.id/blog/index.php/wp-json/wp/v2/media/` + get.data.featured_media)
        res.json({
            // data: get.data,
            id: get.data.id,
            date: get.data.modified,
            title: get.data.title.rendered,
            content: get.data.content.rendered,
            embed: getImage.data.media_details.sizes.medium,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.findBanner = async (req, res, next) => {
    try {
        const get = await axios.get(`https://chickin.id/blog/index.php/wp-json/wp/v2/posts/2701`)
        const getImage = await axios.get(`https://chickin.id/blog/index.php/wp-json/wp/v2/media/`+ get.data.featured_media);
        res.json({
            id: get.data.id,
            date: get.data.modified,
            title: get.data.title.rendered,
            content: get.data.content.rendered,
            embed: getImage.data.media_details.sizes.medium,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.findRekomendasi = async (req, res, next) => {
    try {
        const get = await axios.get('https://chickin.id/blog/index.php/wp-json/wp/v2/posts?categories=31');
        var asyncMap = await Promise.all(get.data.map(async(x) => {
            // if(x.featured_media === 2749) return;
                const getImage = await axios.get(`https://chickin.id/blog/index.php/wp-json/wp/v2/media/`+ x.featured_media)
                const obj = {
                    id: x.id,
                    date: x.modified,
                    title: x.title.rendered,
                    content: x.content.rendered,
                    embed: getImage.data.media_details.sizes.medium, 
                }
                return obj
        }))
        res.json({
            data: asyncMap,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.getProduk = async (req, res, next) => {
    try {
        const get = await axios.get(`https://chickin.id/blog/wp-json/wp/v2/posts?categories=32`);
        var asyncMap = await Promise.all(get.data.map(async(x) => {
            const getImage = await axios.get(`https://chickin.id/blog/index.php/wp-json/wp/v2/media/`+ x.featured_media)
            const obj = {
                id: x.id,
                date: x.modified,
                title: x.title.rendered,
                content: x.content.rendered,
                embed: getImage.data.media_details.sizes.medium, 
           } 
           return obj
        }))
        res.json({
            data: asyncMap,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.getHarga = async (req, res, next) => {
    try {
        const get = await axios.get(`https://chickin.id/blog/wp-json/wp/v2/posts/3199`);
        const getImage = await axios.get(`https://chickin.id/blog/index.php/wp-json/wp/v2/media/` + get.data.featured_media)
        res.json({
            id: get.data.id,
            date: get.data.modified,
            title: get.data.title.rendered,
            content: get.data.content.rendered,
            embed: getImage.data.media_details.sizes.medium,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}