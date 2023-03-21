const Api_key="f4b578228473c9a6010cf190aaef9e85"
const iconurl=(icon)=>`https://openweathermap.org/img/wn/${icon}@2x.png`
const formattemp=(temp)=>`${temp?.toFixed(1)}°`;
let selectedcitytext;
let selectedcity;
const DAYS_OF_THE_WEEKS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];


const getcurrentemp= async ({lat,lon,name:city})=>{
    let url=lat&&lon?`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${Api_key}&units=metric`:`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${Api_key}&units=metric`
    const response=await fetch(url)
    return response.json()

}

const gethourlytemp= async ({name:city})=>{
    const response=await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${Api_key}&units=metric`)
    const data= await response.json()
    return data.list.map(forecast=>{
        const {main:{temp,temp_min,temp_max},dt,dt_txt,weather:[{description,icon}]}=forecast;
        return {temp,temp_min,temp_max,dt,dt_txt,description,icon}
    })
}

const getcitynames=async (search)=>{
    const response=await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${search}&limit=5&appid=${Api_key}`)
    return response.json();
}

const getlivelocation=()=>{
    navigator.geolocation.getCurrentPosition(({coords})=>{
        const {longitude:lon,latitude:lat}=coords
        selectedcity={lat,lon}
        loaddata()
    },error=>console.log(error))
}





const printcurrentweather=({main:{temp,temp_min,temp_max},name,weather:[{description}]})=>{
    document.querySelector(".temp").textContent=formattemp(temp)
    document.querySelector(".description").textContent=description;
    document.querySelector(".min-max-temp").textContent=`H:${formattemp(temp_max)}   L:${formattemp(temp_min)}`     
    document.querySelector(".city").textContent=name
   
}


const printhourlyforecast=({main:{temp},weather:[{icon}]},hourlydata)=>{
    const timeformatter=Intl.DateTimeFormat("en",
    {hour12:true,hour:"numeric"});
    const hourly12data=(hourlydata.slice(2,14))
    let inerhtml=document.querySelector(".hourly");
    let innerstring= `<article>
    <h3 class="hourly-time">Now</h3>
    <img class="hourly-image" src="${iconurl(icon)}" alt="">
    <p class="hourly-temp">${formattemp(temp)}</p>
</article>`;
    for(let {temp,icon,dt_txt} of hourly12data){
        innerstring+=`<article>
        <h3 class="hourly-time">${timeformatter.format(new Date(dt_txt)).toLowerCase()}</h3>
        <img class="hourly-image" src="${iconurl(icon)}" alt="">
        <p class="hourly-temp">${formattemp(temp)}</p>
    </article>`
    }
    inerhtml.innerHTML=innerstring

}


const calculatedaywiseforecast=(hourly)=>{
      let Daywiseforecast=new Map()
      for(let forecast of hourly){
        const [date]=forecast.dt_txt.split(" ");
        const dayoftheweek=DAYS_OF_THE_WEEKS[new Date(date).getDay()]
        if(Daywiseforecast.has(dayoftheweek)){
            const forecastfortheday=Daywiseforecast.get(dayoftheweek)
            forecastfortheday.push(forecast)
        }else{
            Daywiseforecast.set(dayoftheweek,[forecast])
        }
      }
      for(let [key,value] of Daywiseforecast){
        let temp_min=Math.min(...Array.from(value,val=>val.temp_min))
        let temp_max=Math.max(...Array.from(value,val=>val.temp_max))
        let icon=value.find(val=>val.icon).icon
        Daywiseforecast.set(key,{temp_max,temp_min,icon})
    }
    return Daywiseforecast
}


const printfivedayforecast=(data)=>{
    const daywiseforecast=calculatedaywiseforecast(data)
    const innerhtml=document.querySelector(".fivedayforecast")
    let innerstring=``
    Array.from(daywiseforecast).map(([key,{temp_max,temp_min,icon}],index)=>{
        innerstring+=`<article class="daywiseforecast">
        <h3 class="fivedaydate">${index==0?"Today":key}</h3>
        <img class="fivedayimage" src="${iconurl(icon)}" >
        <p class="temp_low">${formattemp(temp_min)}</p>
        <p class="temp_high">${formattemp(temp_max)}</p>
    </article>`
    })
    innerhtml.innerHTML=`${innerstring}`
}


const printfeelslike=({main:{feels_like}})=>{
     document.querySelector(".feels").textContent=formattemp(feels_like)
}


const printhumidity=({main:{humidity}})=>{
    document.querySelector(".humidity").textContent=`${humidity}%`
}


const debounce=(searchdelay)=>{
    let timer;
    return (...argument)=>{
        clearTimeout(timer);
        timer =setTimeout(()=>
        {searchdelay.apply(this,argument)},500)
    }
}


const onsearch=async (event)=>{
   let {value}=event.target
   if(!value){
    selectedcity=null;
    selectedcitytext=""
   }
   if(value && (selectedcitytext!=value)){

       let cities= await getcitynames(value)
       let options=``
       for(let {country,state,name,lon,lat} of cities){
        options+=`<option data-city-details='${JSON.stringify({lat,lon,name})}' value="${name},${state},${country}"></option>`
       }
       document.querySelector("#searchings").innerHTML=options
   }
}


const cityselection=(event)=>{
    selectedcitytext=event.target.value
    let options=document.querySelectorAll("#searchings>option")
    if(options?.length){
      let selectedoption=  (Array.from(options).find(opt=>opt.value==selectedcitytext))
      selectedcity=JSON.parse(selectedoption.getAttribute("data-city-details"))
      console.log(selectedcity)

      loaddata()
    }
}


const loaddata=async()=>{
    const current=await getcurrentemp(selectedcity);
    printcurrentweather(current);
    const hourly=await gethourlytemp(current)
    printhourlyforecast(current,hourly)
    printfeelslike(current);
    printhumidity(current)
    printfivedayforecast(hourly)
}





document.addEventListener("DOMContentLoaded",()=>{
    getlivelocation()
    document.querySelector("#searching").addEventListener("input",debounce((event)=>onsearch(event)))
    document.querySelector("#searching").addEventListener("change",cityselection)
    
})