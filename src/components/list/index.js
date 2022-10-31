import React, { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { Input } from 'antd';
import "./index.less";



const { Search } = Input;
const List = ({ configuration ='{}' }) => {
  const headerRef = useRef(null)
  const [config, setConfig] = useState('')
  useEffect(() => {
    setConfig(JSON.parse(configuration))
  }, [])
const onSearch = (value)=> {
  console.log(value, '====', config);
  console.log(configuration)

  if(config['jumpUrl'] && config['JumpParam']) {
    let url = config['jumpUrl'] + '?'+ config['JumpParam'] + "=" + value;
    window.open(url)
  }
}

  return (
    <> 
       <div className="Header"
    >

      <div className="titleHeader " ref={headerRef}  >
        <div className="lineRight">
        <Search
              placeholder="请输入关键词"
              onSearch={onSearch}
              style={{ borderRadius: "15px 0px 0px 15px", color: "#ffffff" }}
            />
        </div>
     
      </div>



    </div>
    </>

  )
};

List.propTypes = {
  isDesign: PropTypes.bool,
  tableColumns: PropTypes.array,
  modelInfo: PropTypes.object,
};

export default List;
