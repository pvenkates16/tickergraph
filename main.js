const svg = d3.select("#graph");
const width = window.innerWidth;
const height = window.innerHeight;
svg.attr("width", width).attr("height", height);

const color = d3.scaleOrdinal()
  .domain(["company", "driver", "anti"])
  .range(["#1f77b4", "#2ca02c", "#d62728"]);

const tooltip = d3.select("#tooltip");
const container = svg.append("g");

let simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(d => d.id).distance(160))
  .force("charge", d3.forceManyBody().strength(-800))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide(45));

d3.json("data.json").then(({ nodes, links }) => {
  const allCompanies = nodes.filter(d => d.group === "company").map(d => d.id);
  const dropdown = d3.select("#companySelect");

  dropdown.on("change", function () {
    const selected = this.value;
    render(selected === "ALL" ? links : links.filter(l => l.source === selected));
  });

  dropdown.selectAll("option")
    .data(["ALL", ...allCompanies])
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  render(links);

  function render(activeLinks) {
    const activeNodeIDs = new Set();
    activeLinks.forEach(l => {
      activeNodeIDs.add(typeof l.source === "object" ? l.source.id : l.source);
      activeNodeIDs.add(typeof l.target === "object" ? l.target.id : l.target);
    });

    const activeNodes = nodes.filter(n => activeNodeIDs.has(n.id));
    simulation.nodes(activeNodes);
    simulation.force("link").links(activeLinks);
    simulation.alpha(1).restart();

    const node = container.selectAll("circle")
      .data(activeNodes, d => d.id)
      .join(
        enter => enter.append("circle")
          .attr("r", 10)
          .attr("fill", d => color(d.group))
          .call(drag(simulation))
          .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`<strong>${d.id}</strong><br>Type: ${d.group}`)
              .style("left", (event.pageX + 12) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", () => tooltip.transition().duration(300).style("opacity", 0))
      );

    const label = container.selectAll("text")
      .data(activeNodes, d => d.id)
      .join(
        enter => enter.append("text")
          .text(d => d.id)
          .attr("dx", 12)
          .attr("dy", "0.35em")
          .style("font-size", "12px")
      );

    const link = container.selectAll("line")
      .data(activeLinks, d => `${d.source}-${d.target}`)
      .join(
        enter => enter.append("line")
          .attr("stroke", d => {
            const targetGroup = nodes.find(n => n.id === (d.target.id || d.target))?.group;
            return targetGroup === "anti" ? "#d62728" : "#2ca02c";
          })
          .attr("stroke-width", d => Math.sqrt(Math.abs(d.value)))
          .attr("stroke-opacity", 0.6)
      );

    simulation.on("tick", () => {
      node.attr("cx", d => d.x).attr("cy", d => d.y);
      label.attr("x", d => d.x).attr("y", d => d.y);
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    });
  }
});

function drag(sim) {
  return d3.drag()
    .on("start", (event, d) => {
      if (!event.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on("drag", (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on("end", (event, d) => {
      if (!event.active) sim.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });
}

