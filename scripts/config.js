! function() {
    "use strict";
    window.BLACKCART_CONFIG = {
        server: {
            baseURL: "https://blackcart.co:3000",
            endPoints: {
                auth: "/auth",
                getUserByID: "/user/",
                getOrder: "/order",
                getOrderByUser: "/order/byuser",
                addProduct: "/order/addproduct",
                removeProduct: "/order/removeproduct",
                createOrder: "/order",
                getToken: "/token",
                refreshToken: "/token/refresh",
                getBrands: "/brands",
                getUserInfo: "/user/info",
                saveShippingInfo: "/user/info/shipping",
                savePaymentInfo: "/user/info/payment",
                analytics: {
                    showButton: "/analytics/showbutton"
                }
            }
        },
        uploadURL: "https://api.imgur.com/3/image",
        loginRedirectURL: "https://blackcart.co/register/walkthrough.php"
    }
}();