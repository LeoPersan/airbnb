var map
function initMap() {
    map = new google.maps.Map(document.getElementById('map'))
}

function getData(data, onload) {
    if (typeof data == 'object')
        return onload(data)
    ajax = new XMLHttpRequest()
    ajax.open('GET', data, false)
    ajax.onload = onload
    ajax.send()
}

function loadDates(properties) {
    checkin = document.querySelector('input[name=checkin]')
    checkout = document.querySelector('input[name=checkout]')

    function subOneDay(date = '') {
        date = date.length == 0 ? new Date() : new Date(date)
        date.setDate(date.getDate() - 1)
        return date
    }

    function sumOneDay(date = '') {
        date = date.length == 0 ? new Date() : new Date(date)
        date.setDate(date.getDate() + 1)
        return date
    }

    function sumOneYear(date = '') {
        date = date.length == 0 ? new Date() : new Date(date)
        date.setFullYear(date.getFullYear() + 1)
        return date
    }

    function calcPropertiesTotalPrice(date1 = '', date2 = '') {
        date1 = date1.length == 0 ? new Date() : new Date(date1)
        date2 = date2.length == 0 ? new Date() : new Date(date2)
        days = Math.ceil((date1 - date2) / (1000 * 60 * 60 * 24))
        days = days < 1 ? 1 : days
        properties.forEach(property => {
            property.totalPrice = days * property.price
            property.querySelector('.total_price').style.opacity = 1
            property.querySelector('.total_price .value').textContent = `R$ ${property.totalPrice.toFixed(2).replace('.',',')}`
        });
    }

    today = new Date().toISOString().split('T')[0]
    tomorrow = sumOneDay(today).toISOString().split('T')[0]
    nextYear = sumOneYear(today).toISOString().split('T')[0]

    checkin.setAttribute('min', today)
    checkin.setAttribute('max', nextYear)
    checkin.addEventListener('change', () => {
        checkout.setAttribute('min', sumOneDay(checkin.value).toISOString().split('T')[0])
        checkout.setAttribute('max', sumOneYear(checkin.value).toISOString().split('T')[0])
        calcPropertiesTotalPrice(checkout.value, checkin.value)
    })

    checkout.setAttribute('min', tomorrow)
    checkout.setAttribute('max', nextYear)
    checkout.addEventListener('change', () => {
        max = checkout.value.length == 0 ? sumOneYear() : subOneDay(checkout.value)
        checkin.setAttribute('max', max.toISOString().split('T')[0])
        calcPropertiesTotalPrice(checkout.value, checkin.value)
    })
}

function loadPrices(properties) {
    let prices = {}
    min = properties.reduce((min, item) => min > item.price ? item.price : min, 1000000000);
    max = properties.reduce((max, item) => max < item.price ? item.price : max, 0);

    let inputs = document.querySelectorAll('input[name="prices[]"]')
    let isFirst = true
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            writeLabelPriceRange()
            properties.show()
        })
        input.setAttribute('min', min)
        input.setAttribute('max', max)
        input.setAttribute('value', isFirst ? min : max)
        isFirst = false
    });


    function writeLabelPriceRange() {
        inputs = document.querySelectorAll('input[name="prices[]"]')
        values = []
        inputs.forEach(input => values.push(Number.parseInt(input.value)))
        values = values.sort((a, b) => a - b)
        prices.min = values[0]
        prices.max = values[1]
        document.querySelector('.price_range').textContent = `R$ ${Number.parseInt(prices.min)} - R$ ${Number.parseInt(prices.max)}`
    }
    writeLabelPriceRange()

    return prices
}

async function orderByGeoLocation(properties) {
    function getCoordinates() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject)
        })
    }
    try {
        userLocation = await getCoordinates()
        userLocation = userLocation.coords
        properties = properties.map(property => {
            property.distance = ((userLocation.latitude - property.latitude) ** 2) + ((userLocation.longitude - property.longitude) ** 2)
            return property
        })
        properties = properties.sort((a, b) => a.distance - b.distance)
    } catch (error) {
        console.log(error)
    }
    return properties
}

function setMarkersOnMap(properties) {
    let sw = { lat: 90, lng: 180 }
    let ne = { lat: -90, lng: -180 }
    let iconDefault = new window.google.maps.MarkerImage(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Google_Maps_pin.svg/274px-Google_Maps_pin.svg.png',
        null,
        null,
        null,
        new google.maps.Size(24, 42)
    )
    let iconOver = new window.google.maps.MarkerImage(
        'https://lh3.googleusercontent.com/proxy/_nqv8zhq8s5wYlUw-trY6MniZwbzfg2Ue0aUA4HrR4PrUrovANqqaQQbnXmHSKe-2RScKrxqmwsF7r5yu7NJi10EOVwNb4xgheeomNdOQoDuDbmen2fV1jU',
        null,
        null,
        null,
        new google.maps.Size(35, 55)
    )

    properties.forEach(property => {
        mouseover = () => property.marker.setIcon(iconOver)
        mouseout = () => property.marker.setIcon(iconDefault)

        property.marker = new window.google.maps.Marker({
            position: { lat: property.latitude, lng: property.longitude },
            map: map,
            icon: iconDefault
        })


        window.google.maps.event.addListener(property.marker, 'click', () => {
            window.location.hash = property.slug
        })
        window.google.maps.event.addListener(property.marker, 'mouseover', mouseover)
        window.google.maps.event.addListener(property.marker, 'mouseout', mouseout)
        property.addEventListener('mouseover', mouseover)
        property.addEventListener('mouseout', mouseout)

        sw.lat = sw.lat > property.latitude ? property.latitude : sw.lat
        sw.lng = sw.lng > property.longitude ? property.longitude : sw.lng

        ne.lat = ne.lat < property.latitude ? property.latitude : ne.lat
        ne.lng = ne.lng < property.longitude ? property.longitude : ne.lng
    })
    sw.lat += 0.01
    sw.lng += 0.01
    ne.lat -= 0.01
    ne.lng -= 0.01
    map.fitBounds(new google.maps.LatLngBounds(sw, ne))
}

function str_slug(str) {
    str = str.replace(/^\s+|\s+$/g, '')
    str = str.toLowerCase()

    var from = "àáãäâèéëêìíïîòóöôùúüûñç·/_,:;"
    var to = "aaaaaeeeeiiiioooouuuunc------"
    for (var i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i))
    }

    str = str.replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')

    return str;
}

function translate(property) {
    switch (property.property_type) {
        case 'Entire apartment':
            property.property_type = 'Apartamento inteiro'
            break;
        case 'Entire guesthouse':
            property.property_type = 'Casa inteira'
            break;
        case 'Entire loft':
            property.property_type = 'Loft inteiro'
            break;
        case 'Entire serviced apartment':
            property.property_type = 'Apartamento com serviço completo'
            break;
        case 'Entire condominium':
            property.property_type = 'Condomínio inteiro'
            break;
    }
    switch (property.price_rate_type) {
        case 'nightly':
            property.price_rate_type = 'noite'
            break;
    }
    return property
}

async function loadProperties(properties) {
    let container = document.querySelector('.properties')
    let propertyDom = document.querySelector('.property').cloneNode(true)
    document.querySelector('.property').remove();

    properties = properties.map(property => {
        property = Object.assign(propertyDom.cloneNode(true), property)
        property.photo = property.photos[0].large ?? property.photo
        property.property_type = property.room_and_property_type ?? property.property_type
        property.price = property.price_rate ?? property.price
        property.slug = str_slug(property.name)

        property = translate(property)

        property.querySelectorAll('.link').forEach(link => {
            link.href = property.url
        })
        property.querySelector('.anchor').name = property.slug
        property.querySelector('.photo').style.backgroundImage = `url(${property.photo})`
        property.querySelector('.rate').textContent = property.star_rating.toFixed(1).replace('.',',')
        property.querySelector('.count').textContent = `(${property.review_count})`
        property.querySelector('.property_type').textContent = property.property_type
        property.querySelector('.name').textContent = property.name
        property.querySelector('.price').textContent = `R$ ${property.price.toFixed(2).replace('.',',')}`
        property.querySelector('.price_type').textContent = `/${property.price_rate_type}`
        return property
    })

    if ("geolocation" in navigator) properties = await orderByGeoLocation(properties)

    properties.show = () => properties.forEach(property => {
        property.style.display = properties.filter(property) ? 'flex' : 'none'
        property.marker.setMap(properties.filter(property) ? map : null)
    })

    properties.filter = property => property.price >= prices.min && property.price <= prices.max

    properties.map(property => container.append(property))
    setMarkersOnMap(properties)
    prices = loadPrices(properties)
    loadDates(properties)
}

getData('https://leopersan.github.io/airbnb/data.json', () => {
    loadProperties(JSON.parse(ajax.response))
})